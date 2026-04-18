/**
 * Tests for input validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  slkSchema,
  roadIdSchema,
  roadNameSchema,
  regionSchema,
  latitudeSchema,
  longitudeSchema,
  speedLimitSchema,
  coordinateSchema,
  roadSearchQuerySchema,
  speedZonesQuerySchema,
  weatherQuerySchema,
  savedLocationInputSchema,
  validate,
  safeValidate,
  validationErrorResponse,
  sanitizeHtml,
  isHtmlSafe,
} from './validation';

describe('Common Schemas', () => {
  describe('slkSchema', () => {
    it('accepts valid SLK values', () => {
      expect(slkSchema.safeParse(0).success).toBe(true);
      expect(slkSchema.safeParse(123.456).success).toBe(true);
      expect(slkSchema.safeParse(999.999).success).toBe(true);
    });

    it('rejects negative SLK', () => {
      const result = slkSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('rejects SLK with more than 3 decimal places', () => {
      const result = slkSchema.safeParse(123.4567);
      expect(result.success).toBe(false);
    });

    it('rejects unreasonably large SLK', () => {
      const result = slkSchema.safeParse(10000);
      expect(result.success).toBe(false);
    });
  });

  describe('roadIdSchema', () => {
    it('accepts valid road IDs', () => {
      expect(roadIdSchema.safeParse('H001').success).toBe(true);
      expect(roadIdSchema.safeParse('M001').success).toBe(true);
      expect(roadIdSchema.safeParse('S001').success).toBe(true);
      expect(roadIdSchema.safeParse('H001A').success).toBe(true);
      expect(roadIdSchema.safeParse('MP001').success).toBe(true);
    });

    it('rejects empty road ID', () => {
      const result = roadIdSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects invalid format', () => {
      expect(roadIdSchema.safeParse('123').success).toBe(false);
      expect(roadIdSchema.safeParse('ROAD').success).toBe(false);
    });
  });

  describe('roadNameSchema', () => {
    it('accepts valid road names', () => {
      expect(roadNameSchema.safeParse('Albany Highway').success).toBe(true);
      expect(roadNameSchema.safeParse('Great Eastern Highway').success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = roadNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects names over 200 chars', () => {
      const result = roadNameSchema.safeParse('a'.repeat(201));
      expect(result.success).toBe(false);
    });
  });

  describe('regionSchema', () => {
    it('accepts valid regions', () => {
      expect(regionSchema.safeParse('Metropolitan').success).toBe(true);
      expect(regionSchema.safeParse('Goldfields-Esperance').success).toBe(true);
    });

    it('rejects empty region', () => {
      const result = regionSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('latitudeSchema', () => {
    it('accepts valid latitudes', () => {
      expect(latitudeSchema.safeParse(0).success).toBe(true);
      expect(latitudeSchema.safeParse(-31.9505).success).toBe(true); // Perth
      expect(latitudeSchema.safeParse(90).success).toBe(true);
      expect(latitudeSchema.safeParse(-90).success).toBe(true);
    });

    it('rejects latitudes outside range', () => {
      expect(latitudeSchema.safeParse(91).success).toBe(false);
      expect(latitudeSchema.safeParse(-91).success).toBe(false);
    });
  });

  describe('longitudeSchema', () => {
    it('accepts valid longitudes', () => {
      expect(longitudeSchema.safeParse(0).success).toBe(true);
      expect(longitudeSchema.safeParse(115.8605).success).toBe(true); // Perth
      expect(longitudeSchema.safeParse(180).success).toBe(true);
      expect(longitudeSchema.safeParse(-180).success).toBe(true);
    });

    it('rejects longitudes outside range', () => {
      expect(longitudeSchema.safeParse(181).success).toBe(false);
      expect(longitudeSchema.safeParse(-181).success).toBe(false);
    });
  });

  describe('coordinateSchema', () => {
    it('accepts valid coordinates', () => {
      const result = coordinateSchema.safeParse({ lat: -31.9505, lon: 115.8605 });
      expect(result.success).toBe(true);
    });

    it('rejects invalid coordinates', () => {
      expect(coordinateSchema.safeParse({ lat: 100, lon: 0 }).success).toBe(false);
      expect(coordinateSchema.safeParse({ lat: 0, lon: 200 }).success).toBe(false);
    });
  });

  describe('speedLimitSchema', () => {
    it('accepts valid speed limits', () => {
      expect(speedLimitSchema.safeParse(60).success).toBe(true);
      expect(speedLimitSchema.safeParse(110).success).toBe(true);
      expect(speedLimitSchema.safeParse(40).success).toBe(true);
    });

    it('rejects non-integers', () => {
      const result = speedLimitSchema.safeParse(60.5);
      expect(result.success).toBe(false);
    });

    it('rejects unreasonable values', () => {
      expect(speedLimitSchema.safeParse(5).success).toBe(false);
      expect(speedLimitSchema.safeParse(250).success).toBe(false);
    });
  });
});

describe('API Input Schemas', () => {
  describe('roadSearchQuerySchema', () => {
    it('parses valid query', () => {
      const result = roadSearchQuerySchema.parse({
        q: 'Albany',
        limit: '10',
        offset: '0',
      });
      expect(result.q).toBe('Albany');
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('uses default values', () => {
      const result = roadSearchQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('speedZonesQuerySchema', () => {
    it('requires road_id', () => {
      const result = speedZonesQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts valid query', () => {
      const result = speedZonesQuerySchema.parse({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
      });
      expect(result.road_id).toBe('H001');
    });
  });

  describe('weatherQuerySchema', () => {
    it('requires lat and lon', () => {
      const result = weatherQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('coerces string numbers', () => {
      const result = weatherQuerySchema.parse({
        lat: '-31.95',
        lon: '115.86',
      });
      expect(result.lat).toBe(-31.95);
      expect(result.lon).toBe(115.86);
    });
  });
});

describe('Form Input Schemas', () => {
  describe('savedLocationInputSchema', () => {
    it('accepts valid input', () => {
      const result = savedLocationInputSchema.parse({
        name: 'My Location',
        road_id: 'H001',
        road_name: 'Albany Highway',
        region: 'Metropolitan',
        start_slk: 10.5,
        end_slk: 15.5,
      });
      expect(result.name).toBe('My Location');
    });

    it('allows null end_slk', () => {
      const result = savedLocationInputSchema.parse({
        name: 'Point Location',
        road_id: 'H001',
        road_name: 'Albany Highway',
        region: 'Metropolitan',
        start_slk: 10.5,
        end_slk: null,
      });
      expect(result.end_slk).toBeNull();
    });

    it('trims name whitespace', () => {
      const result = savedLocationInputSchema.parse({
        name: '  My Location  ',
        road_id: 'H001',
        road_name: 'Albany Highway',
        region: 'Metropolitan',
        start_slk: 10.5,
      });
      expect(result.name).toBe('My Location');
    });

    it('rejects missing required fields', () => {
      const result = savedLocationInputSchema.safeParse({
        name: 'My Location',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Helpers', () => {
  describe('validate', () => {
    it('returns parsed data on success', () => {
      const result = validate(slkSchema, 10.5);
      expect(result).toBe(10.5);
    });

    it('throws on validation failure', () => {
      expect(() => validate(slkSchema, -1)).toThrow();
    });
  });

  describe('safeValidate', () => {
    it('returns success result', () => {
      const result = safeValidate(slkSchema, 10.5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10.5);
      }
    });

    it('returns error result', () => {
      const result = safeValidate(slkSchema, -1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('validationErrorResponse', () => {
    it('creates error response from ZodError', () => {
      const result = safeValidate(slkSchema, -1);
      if (!result.success) {
        const response = validationErrorResponse(result.errors);
        expect(response.success).toBe(false);
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.details).toBeDefined();
        expect(response.timestamp).toBeDefined();
      }
    });
  });
});

// ─── HTML Sanitization Tests ─────────────────────────────────────────────────

describe('HTML Sanitization', () => {
  describe('sanitizeHtml', () => {
    describe('basic sanitization', () => {
      it('returns empty string for empty/null input', () => {
        expect(sanitizeHtml('')).toBe('');
        expect(sanitizeHtml(null as unknown as string)).toBe('');
        expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      });

      it('preserves safe HTML', () => {
        const html = '<p>Hello <strong>World</strong></p>';
        expect(sanitizeHtml(html)).toBe('<p>Hello <strong>World</strong></p>');
      });

      it('preserves class attributes', () => {
        const html = '<p class="text-blue">Hello</p>';
        expect(sanitizeHtml(html)).toBe('<p class="text-blue">Hello</p>');
      });
    });

    describe('dangerous tag removal', () => {
      it('removes script tags', () => {
        const html = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
        expect(sanitizeHtml(html)).toBe('<p>Hello</p><p>World</p>');
      });

      it('removes script tags with attributes', () => {
        const html = '<script src="evil.js"></script><p>Safe</p>';
        expect(sanitizeHtml(html)).toBe('<p>Safe</p>');
      });

      it('removes iframe tags', () => {
        const html = '<iframe src="evil.com"></iframe><p>Safe</p>';
        expect(sanitizeHtml(html)).toBe('<p>Safe</p>');
      });

      it('removes object and embed tags', () => {
        const html = '<object data="evil.swf"></object><embed src="evil.swf">';
        expect(sanitizeHtml(html)).toBe('');
      });

      it('removes form tags', () => {
        const html = '<form action="evil.com"><input type="text"></form>';
        expect(sanitizeHtml(html)).toBe('');
      });
    });

    describe('dangerous attribute removal', () => {
      it('removes onclick attributes', () => {
        const html = '<p onclick="alert(1)">Hello</p>';
        expect(sanitizeHtml(html)).toBe('<p>Hello</p>');
      });

      it('removes onerror attributes', () => {
        const html = '<img src="x" onerror="alert(1)">';
        expect(sanitizeHtml(html)).not.toContain('onerror');
      });

      it('removes onload attributes', () => {
        const html = '<body onload="alert(1)"><p>Test</p></body>';
        expect(sanitizeHtml(html)).not.toContain('onload');
      });

      it('removes javascript: URLs', () => {
        const html = '<a href="javascript:alert(1)">Click</a>';
        expect(sanitizeHtml(html)).not.toContain('javascript:');
      });
    });

    describe('tag filtering', () => {
      it('removes disallowed tags but preserves content', () => {
        const html = '<custom>Test</custom><p>Valid</p>';
        // Text content is preserved, only tags are removed
        expect(sanitizeHtml(html)).toBe('Test<p>Valid</p>');
      });

      it('preserves allowed tags', () => {
        const html = '<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>';
        expect(sanitizeHtml(html)).toBe('<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>');
      });

      it('preserves links with safe href', () => {
        const html = '<a href="https://example.com">Link</a>';
        expect(sanitizeHtml(html)).toBe('<a href="https://example.com">Link</a>');
      });

      it('preserves images with safe src', () => {
        const html = '<img src="https://example.com/image.png" alt="Test">';
        expect(sanitizeHtml(html)).toContain('src="https://example.com/image.png"');
        expect(sanitizeHtml(html)).toContain('alt="Test"');
      });
    });

    describe('stripAllTags option', () => {
      it('strips all tags when enabled', () => {
        const html = '<p>Hello <strong>World</strong></p>';
        expect(sanitizeHtml(html, { stripAllTags: true })).toBe('Hello World');
      });

      it('decodes HTML entities when stripping', () => {
        const html = '<p>Hello &amp; World</p>';
        expect(sanitizeHtml(html, { stripAllTags: true })).toBe('Hello & World');
      });
    });

    describe('additional allowed tags option', () => {
      it('allows additional tags when specified', () => {
        const html = '<custom>Test</custom><p>Valid</p>';
        const result = sanitizeHtml(html, { allowedTags: ['custom'] });
        expect(result).toContain('<custom>');
        expect(result).toContain('<p>');
      });
    });

    describe('style sanitization', () => {
      it('preserves safe styles', () => {
        const html = '<p style="color: blue;">Test</p>';
        expect(sanitizeHtml(html)).toContain('style="color: blue;"');
      });

      it('removes expression() in styles', () => {
        const html = '<p style="width: expression(alert(1))">Test</p>';
        expect(sanitizeHtml(html)).not.toContain('expression');
      });
    });
  });

  describe('isHtmlSafe', () => {
    it('returns true for safe HTML', () => {
      expect(isHtmlSafe('<p>Hello World</p>')).toBe(true);
      expect(isHtmlSafe('<a href="https://example.com">Link</a>')).toBe(true);
    });

    it('returns true for empty/null input', () => {
      expect(isHtmlSafe('')).toBe(true);
      expect(isHtmlSafe(null as unknown as string)).toBe(true);
    });

    it('returns false for script tags', () => {
      expect(isHtmlSafe('<script>alert(1)</script>')).toBe(false);
    });

    it('returns false for javascript: URLs', () => {
      expect(isHtmlSafe('<a href="javascript:alert(1)">Click</a>')).toBe(false);
    });

    it('returns false for event handlers', () => {
      expect(isHtmlSafe('<p onclick="alert(1)">Test</p>')).toBe(false);
    });

    it('returns false for iframe tags', () => {
      expect(isHtmlSafe('<iframe src="evil.com"></iframe>')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isHtmlSafe('<SCRIPT>alert(1)</SCRIPT>')).toBe(false);
      expect(isHtmlSafe('<P ONCLICK="alert(1)">Test</P>')).toBe(false);
    });
  });
});
