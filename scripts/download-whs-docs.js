const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Documents to download
const documents = [
  // Existing WHS documents (verify/update)
  {
    url: 'https://www.legislation.wa.gov.au/legislation/statutes.nsf/RedirectURL?OpenAgent&query=mrdoc_48252.pdf',
    file: '/home/z/my-project/public/library/whs/legislation/whs-act-2020.pdf',
    name: 'WHS Act 2020'
  },
  {
    url: 'https://www.legislation.wa.gov.au/legislation/prod/filestore.nsf/FileURL/mrdoc_46970.pdf/$FILE/Work%20Health%20and%20Safety%20(General)%20Regulations%202022%20-%20%5B00-h0-00%5D.pdf',
    file: '/home/z/my-project/public/library/whs/legislation/whs-general-regulations-2022.pdf',
    name: 'WHS General Regulations 2022'
  },
  // Additional WHS Codes of Practice
  {
    url: 'https://www.safeworkaustralia.gov.au/system/files/documents/1705/mcop-construction-work-v1.pdf',
    file: '/home/z/my-project/public/library/whs/codes-of-practice/construction-work-code.pdf',
    name: 'Construction Work Code of Practice'
  },
  {
    url: 'https://www.safeworkaustralia.gov.au/sites/default/files/2021-04/General%20Guide%20to%20Workplace%20Traffic%20Management%20FINAL%202021%202.PDF',
    file: '/home/z/my-project/public/library/whs/codes-of-practice/workplace-traffic-management.pdf',
    name: 'Workplace Traffic Management Guide'
  },
  // WHS Guidance Materials
  {
    url: 'https://www.worksafe.wa.gov.au/system/files/migrated/sites/default/files/atoms/files/231293_br_swms-highrisk.pdf',
    file: '/home/z/my-project/public/library/whs/guidance/swms-high-risk-construction.pdf',
    name: 'SWMS High Risk Construction'
  },
  {
    url: 'https://www.worksafe.wa.gov.au/system/files/migrated/sites/default/files/atoms/files/241282_gl_recordsmgntdoccontrol.pdf',
    file: '/home/z/my-project/public/library/whs/guidance/records-management-guide.pdf',
    name: 'Records Management Guide'
  },
  // Additional relevant WHS documents
  {
    url: 'https://www.safeworkaustralia.gov.au/sites/default/files/2021-04/traffic_management_guidance_information.pdf',
    file: '/home/z/my-project/public/library/whs/guidance/traffic-management-information.pdf',
    name: 'Traffic Management Information Sheet'
  },
  {
    url: 'https://www.worksafe.wa.gov.au/system/files/migrated/sites/default/files/atoms/files/16572_br_highriskconstruction.pdf',
    file: '/home/z/my-project/public/library/whs/guidance/high-risk-construction-work.pdf',
    name: 'High Risk Construction Work Guide'
  },
  // WHS Forms
  {
    url: 'https://www.worksafe.wa.gov.au/system/files/migrated/sites/default/files/atoms/files/16647_fr_swms.pdf',
    file: '/home/z/my-project/public/library/whs/forms/swms-template-worksafe.pdf',
    name: 'SWMS Template WorkSafe WA'
  },
  // MRWA WHS Documents
  {
    url: 'https://www.mainroads.wa.gov.au/globalassets/technical-commercial/contracting-to-main-roads/minimum-whs-control-standards.pdf',
    file: '/home/z/my-project/public/library/mrwa/specifications/minimum-whs-control-standards.pdf',
    name: 'MRWA Minimum WHS Control Standards'
  }
];

function downloadFile(url, dest, name) {
  return new Promise((resolve, reject) => {
    // Check if file already exists and has content
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      if (stats.size > 10000) { // At least 10KB
        console.log(`✓ Already exists: ${name} (${(stats.size / 1024).toFixed(1)} KB)`);
        resolve({ skipped: true, size: stats.size });
        return;
      }
    }
    
    console.log(`Downloading: ${name}`);
    console.log(`  URL: ${url}`);
    
    const protocol = url.startsWith('https') ? https : http;
    const dir = path.dirname(dest);
    
    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(dest);
    
    const request = (url, retries = 3) => {
      protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`  Redirect to: ${redirectUrl}`);
          request(redirectUrl, retries);
          return;
        }
        
        if (response.statusCode !== 200) {
          console.log(`✗ Failed: ${response.statusCode}`);
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(dest);
          console.log(`✓ Downloaded: ${name} (${(stats.size / 1024).toFixed(1)} KB)`);
          resolve({ downloaded: true, size: stats.size });
        });
      }).on('error', (err) => {
        if (retries > 0) {
          console.log(`  Retry ${4 - retries}/3...`);
          setTimeout(() => request(url, retries - 1), 1000);
        } else {
          console.log(`✗ Error: ${err.message}`);
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(err);
        }
      }).setTimeout(30000, () => {
        console.log(`✗ Timeout`);
        request.destroy();
        reject(new Error('Timeout'));
      });
    };
    
    request(url);
  });
}

async function main() {
  console.log('=== WHS Document Download Script ===\n');
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const doc of documents) {
    try {
      const result = await downloadFile(doc.url, doc.file, doc.name);
      if (result.skipped) skipped++;
      else downloaded++;
    } catch (err) {
      failed++;
    }
    // Small delay between downloads
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== Summary ===');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
