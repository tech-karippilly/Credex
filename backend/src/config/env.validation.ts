import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MONGODB_URI is required',
    'string.empty': 'MONGODB_URI cannot be empty',
  }),
  JWT_SECRET: Joi.string().min(8).required().messages({
    'any.required': 'JWT_SECRET is required',
    'string.min': 'JWT_SECRET must be at least 8 characters',
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(8).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required',
    'string.min': 'JWT_REFRESH_SECRET must be at least 8 characters',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ADMIN_EMAIL: Joi.string().email().required().messages({
    'any.required': 'ADMIN_EMAIL is required',
    'string.email': 'ADMIN_EMAIL must be a valid email address',
  }),
  ADMIN_PASSWORD: Joi.string().min(8).required().messages({
    'any.required': 'ADMIN_PASSWORD is required',
    'string.min': 'ADMIN_PASSWORD must be at least 8 characters',
  }),
  FRONTEND_URL: Joi.string().uri().required().messages({
    'any.required': 'FRONTEND_URL is required',
    'string.uri': 'FRONTEND_URL must be a valid URL',
  }),
  PASSWORD_RESET_EXPIRES_IN: Joi.string().default('15m'),
  CLOUDINARY_CLOUD_NAME: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_CLOUD_NAME is required',
  }),
  CLOUDINARY_API_KEY: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_API_KEY is required',
  }),
  CLOUDINARY_API_SECRET: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_API_SECRET is required',
  }),
  RESEND_API_KEY: Joi.string().required().messages({
    'any.required': 'RESEND_API_KEY is required',
  }),
  RESEND_FROM_EMAIL: Joi.string().email().required().messages({
    'any.required': 'RESEND_FROM_EMAIL is required',
    'string.email': 'RESEND_FROM_EMAIL must be a valid email address',
  }),
  GEMINI_API_KEY: Joi.string().required().messages({
    'any.required': 'GEMINI_API_KEY is required',
  }),
  GEMINI_MODEL: Joi.string().required().messages({
    'any.required': 'GEMINI_MODEL is required',
  }),
  WHATSAPP_ACCESS_TOKEN: Joi.string().optional().allow(''),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().optional().allow(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: Joi.string().optional().allow(''),
  WHATSAPP_API_VERSION: Joi.string().default('v21.0'),
  WHATSAPP_VOUCHER_TEMPLATE_NAME: Joi.string().optional().allow(''),
  WHATSAPP_VOUCHER_TEMPLATE_LANGUAGE: Joi.string().default('en'),
  SUPABASE_URL: Joi.string().uri().optional().allow(''),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional().allow(''),
}).options({ abortEarly: false });
