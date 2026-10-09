import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SiteContactDocument = HydratedDocument<SiteContact>;

@Schema({ _id: false })
export class SiteContactImage {
  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({ required: true, trim: true })
  publicId!: string;
}

export const SiteContactImageSchema =
  SchemaFactory.createForClass(SiteContactImage);

@Schema({ _id: false })
export class SiteContactContact {
  @Prop({ default: '', trim: true })
  email!: string;

  @Prop({ default: '', trim: true })
  phone!: string;

  @Prop({ default: '', trim: true })
  location!: string;

  @Prop({ default: '', trim: true })
  linkedinUrl!: string;

  @Prop({ default: '', trim: true })
  instagramUrl!: string;
}

export const SiteContactContactSchema =
  SchemaFactory.createForClass(SiteContactContact);

@Schema({ _id: false })
export class SiteContactHomepage {
  @Prop({ default: '', trim: true })
  mainHeadline!: string;

  @Prop({ default: '', trim: true })
  supportingText!: string;

  @Prop({ type: SiteContactImageSchema, default: null })
  homepageMainImage!: SiteContactImage | null;

  @Prop({ type: SiteContactImageSchema, default: null })
  aboutSectionImage!: SiteContactImage | null;
}

export const SiteContactHomepageSchema =
  SchemaFactory.createForClass(SiteContactHomepage);

@Schema({
  timestamps: true,
  collection: 'site_contact',
})
export class SiteContact {
  @Prop({ required: true, unique: true, default: 'default' })
  key!: string;

  @Prop({ type: SiteContactContactSchema, default: () => ({}) })
  contact!: SiteContactContact;

  @Prop({ type: SiteContactHomepageSchema, default: () => ({}) })
  homepage!: SiteContactHomepage;
}

export const SiteContactSchema = SchemaFactory.createForClass(SiteContact);
