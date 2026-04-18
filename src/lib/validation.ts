/**
 * Input Validation Utilities
 *
 * Provides Zod schemas for runtime validation of API inputs and user data.
 * Use these to validate request bodies, query parameters, and form inputs.
 *
 * @module lib/validation
 */

import { z } from 'zod';

// ─── Common Schemas ───────────────────────────────────────────────────────

/**
 * SLK (Straight Line Kilometre) validation
 * Must be a non-negative number
 */
export const slkSchema = z
  .number()
  .min(0, 'SLK must be non-negative')
  .max(9999.999, 'SLK seems unreasonably large')
  .multipleOf(0.001, 'SLK can have at most 3 decimal places');

/**
 * Road ID validation
 * Format: Typically alphanumeric like "H001", "M001", "S001"
 */
export const roadIdSchema = z
  .string()
  .min(1, 'Road ID is required')
  .max(20, 'Road ID too long')
  .regex(/^[A-Z]{1,3}\d{1,4}[A-Z]?$/i, 'Invalid road ID format');

/**
 * Road name validation
 */
export const roadNameSchema = z
  .string()
  .min(1, 'Road name is required')
  .max(200, 'Road name too long');

/**
 * Region name validation
 */
export const regionSchema = z
  .string()
  .min(1, 'Region is required')
  .max(100, 'Region name too long');

/**
 * Latitude validation
 */
export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be >= -90')
  .max(90, 'Latitude must be <= 90');

/**
 * Longitude validation
 */
export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be >= -180')
  .max(180, 'Longitude must be <= 180');

/**
 * GPS coordinate validation
 */
export const coordinateSchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
});

/**
 * Speed limit validation (km/h)
 */
export const speedLimitSchema = z
  .number()
  .int('Speed limit must be an integer')
  .min(10, 'Speed limit seems too low')
  .max(200, 'Speed limit seems too high');

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO date string validation
 */
export const isoDateSchema = z.string().datetime({ message: 'Invalid ISO date format' });

// ─── API Input Schemas ───────────────────────────────────────────────────────

/**
 * Road search query parameters
 */
export const roadSearchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  road_id: roadIdSchema.optional(),
  region: regionSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Speed zones query parameters
 */
export const speedZonesQuerySchema = z.object({
  road_id: roadIdSchema,
  start_slk: slkSchema.optional(),
  end_slk: slkSchema.optional(),
});

/**
 * Traffic data query parameters
 */
export const trafficQuerySchema = z.object({
  road_id: roadIdSchema.optional(),
  road_name: roadNameSchema.optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  radius: z.coerce.number().min(0.1).max(100).optional(),
});

/**
 * Weather data query parameters
 */
export const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  location: z.string().max(200).optional(),
});

/**
 * Geocoding query parameters
 */
export const geocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(1).max(1000).optional(),
});

// ─── Form Input Schemas ───────────────────────────────────────────────────────

/**
 * Saved location input
 */
export const savedLocationInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  road_id: roadIdSchema,
  road_name: roadNameSchema,
  region: regionSchema,
  start_slk: slkSchema,
  end_slk: slkSchema.nullable().optional(),
});

/**
 * Speed sign override input
 */
export const speedSignOverrideInputSchema = z.object({
  road_id: roadIdSchema,
  road_name: roadNameSchema,
  slk: slkSchema,
  lat: latitudeSchema.optional(),
  lon: longitudeSchema.optional(),
  direction: z.enum(['True Left', 'True Right']),
  sign_type: z.enum(['Single', 'Double']),
  replicated: z.boolean(),
  start_slk: slkSchema,
  end_slk: slkSchema.optional(),
  front_speed: speedLimitSchema,
  back_speed: speedLimitSchema.optional(),
  note: z.string().max(500).optional(),
});

/**
 * Speed zone correction input
 */
export const speedZoneCorrectionInputSchema = z.object({
  road_id: roadIdSchema,
  start_slk: slkSchema,
  end_slk: slkSchema,
  direction: z.enum(['increasing', 'decreasing']),
  correct_speed: speedLimitSchema,
  original_speed: speedLimitSchema,
  notes: z.string().max(500).optional(),
});

/**
 * Traffic event log input
 */
export const trafficEventLogInputSchema = z.object({
  event_type: z.string().min(1).max(50),
  road_id: roadIdSchema.optional(),
  road_name: roadNameSchema.optional(),
  slk: slkSchema.optional(),
  notes: z.string().max(2000).optional(),
  weather: z.string().max(100).optional(),
});

/**
 * Settings update input
 */
export const settingsInputSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  gpsHighAccuracy: z.boolean().optional(),
  gpsUpdateInterval: z.number().int().min(100).max(10000).optional(),
  autoDownloadOfflineData: z.boolean().optional(),
  offlineDataRegions: z.array(z.string().max(100)).optional(),
  autoSync: z.boolean().optional(),
  googleSheetsUrl: z.string().url().max(500).optional().nullable(),
});

// ─── Type Inference ───────────────────────────────────────────────────────

export type RoadSearchQuery = z.infer<typeof roadSearchQuerySchema>;
export type SpeedZonesQuery = z.infer<typeof speedZonesQuerySchema>;
export type TrafficQuery = z.infer<typeof trafficQuerySchema>;
export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>;
export type SavedLocationInput = z.infer<typeof savedLocationInputSchema>;
export type SpeedSignOverrideInput = z.infer<typeof speedSignOverrideInputSchema>;
export type SpeedZoneCorrectionInput = z.infer<typeof speedZoneCorrectionInputSchema>;
export type TrafficEventLogInput = z.infer<typeof trafficEventLogInputSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validate and parse input data against a schema
 * Returns the parsed data or throws a ZodError
 */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validate input data
 * Returns success/error result without throwing
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate API query parameters
 * Converts string values and handles common parsing issues
 */
export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: Record<string, string | string[] | undefined>
): z.infer<T> {
  // Handle array values (take first element)
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  return schema.parse(normalized);
}

/**
 * Create a validation error response for API routes
 */
export function validationErrorResponse(error: z.ZodError) {
  const errors = error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details: { errors },
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── HTML Sanitization ───────────────────────────────────────────────────────

/**
 * Dangerous HTML tags that should be removed
 */
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'meta',
  'link',
  'base',
  'style',
];

/**
 * Dangerous HTML attributes that should be removed
 */
const DANGEROUS_ATTRS = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onkeydown',
  'onkeyup',
  'onfocus',
  'onblur',
  'onsubmit',
  'onchange',
  'oninput',
  'ondblclick',
  'oncontextmenu',
  'ondrag',
  'ondrop',
  'formaction',
  'xlink:href',
];

/**
 * Allowed HTML tags for user content
 */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'span',
  'a',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'blockquote',
  'pre',
  'code',
];

/**
 * Allowed HTML attributes (by tag or global)
 */
const ALLOWED_ATTRS: Record<string, string[]> = {
  '*': ['class', 'id', 'style'],
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
};

/**
 * Sanitize HTML content for safe rendering with dangerouslySetInnerHTML
 *
 * This is a lightweight sanitizer for defense-in-depth. For production use
 * with user-generated content, consider using DOMPurify.
 *
 * @param html - The HTML string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 *
 * @example
 * const safeHtml = sanitizeHtml(userContent);
 * return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
 */
export function sanitizeHtml(
  html: string,
  options: {
    /** Additional allowed tags */
    allowedTags?: string[];
    /** Remove all tags, keep only text */
    stripAllTags?: boolean;
  } = {}
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const { allowedTags = [], stripAllTags = false } = options;
  const allAllowedTags = [...ALLOWED_TAGS, ...allowedTags];

  // If stripping all tags, just extract text content
  if (stripAllTags) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }

  let sanitized = html;

  // Remove dangerous tags completely (including content)
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // Remove dangerous attributes
  for (const attr of DANGEROUS_ATTRS) {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also handle unquoted values
    const unquotedRegex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    sanitized = sanitized.replace(unquotedRegex, '');
  }

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove data: URLs in href/src (except images)
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"');

  // Remove any tags not in the allowed list
  if (allAllowedTags.length > 0) {
    // Match all tags
    sanitized = sanitized.replace(/<(\/?)(\w+)([^>]*)>/g, (match, isClosing, tagName, attrs) => {
      const lowerTag = tagName.toLowerCase();
      if (!allAllowedTags.includes(lowerTag)) {
        return ''; // Remove disallowed tag
      }

      if (isClosing) {
        return `</${lowerTag}>`;
      }

      // Filter attributes
      const filteredAttrs = filterAttributes(attrs, lowerTag);
      return filteredAttrs ? `<${lowerTag} ${filteredAttrs}>` : `<${lowerTag}>`;
    });
  }

  return sanitized;
}

/**
 * Filter attributes for a given tag
 */
function filterAttributes(attrs: string, tagName: string): string {
  const globalAllowed = ALLOWED_ATTRS['*'] || [];
  const tagAllowed = ALLOWED_ATTRS[tagName] || [];
  const allAllowed = [...globalAllowed, ...tagAllowed];

  // Parse attributes
  const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
  const filtered: string[] = [];
  let match;

  while ((match = attrRegex.exec(attrs)) !== null) {
    const [, attrName, attrValue] = match;
    const lowerAttr = attrName.toLowerCase();

    if (allAllowed.includes(lowerAttr)) {
      // Additional validation for specific attributes
      if (lowerAttr === 'href' || lowerAttr === 'src') {
        // Only allow safe protocols
        const safeValue = validateUrl(attrValue);
        filtered.push(`${lowerAttr}="${safeValue}"`);
      } else if (lowerAttr === 'style') {
        // Remove potentially dangerous CSS
        const safeStyle = sanitizeStyle(attrValue);
        if (safeStyle) {
          filtered.push(`style="${safeStyle}"`);
        }
      } else {
        filtered.push(`${lowerAttr}="${attrValue}"`);
      }
    }
  }

  return filtered.join(' ');
}

/**
 * Validate and sanitize URL
 */
function validateUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Allow safe protocols
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', 'data:image/'];

  const isSafe = safeProtocols.some((proto) => trimmed.startsWith(proto)) || !trimmed.includes(':'); // Relative URLs are safe

  return isSafe ? url : '#';
}

/**
 * Sanitize CSS style attribute
 */
function sanitizeStyle(style: string): string {
  // Remove potentially dangerous CSS
  const dangerousPatterns = [
    /expression\s*\(/i,
    /javascript\s*:/i,
    /behavior\s*:/i,
    /-moz-binding\s*:/i,
  ];

  let sanitized = style;
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return ''; // Remove entire style if dangerous patterns found
    }
  }

  return sanitized;
}

/**
 * Check if HTML content appears safe for rendering
 * Does NOT guarantee safety - use sanitizeHtml for actual protection
 */
export function isHtmlSafe(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true;
  }

  const lower = html.toLowerCase();

  // Check for obvious dangerous content
  const dangerousPatterns = [
    /<script/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /data:\s*text\/html/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(lower));
}
