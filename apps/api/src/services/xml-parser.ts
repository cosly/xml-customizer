import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { KyeroProperty, PropertySummary } from '@xml-customizer/shared';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
};

export class XmlParserService {
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor() {
    this.parser = new XMLParser(parserOptions);
    this.builder = new XMLBuilder(builderOptions);
  }

  /**
   * Parse XML string and extract all properties
   */
  parseXml(xmlString: string): KyeroProperty[] {
    const parsed = this.parser.parse(xmlString);
    const root = parsed.root;

    if (!root || !root.property) {
      return [];
    }

    // Ensure properties is always an array
    const properties = Array.isArray(root.property) ? root.property : [root.property];

    return properties.map((prop: any) => this.mapProperty(prop));
  }

  /**
   * Get property summaries (lightweight version for UI)
   */
  getPropertySummaries(xmlString: string): PropertySummary[] {
    const properties = this.parseXml(xmlString);
    return properties.map((prop) => ({
      id: prop.id,
      ref: prop.ref,
      type: prop.type,
      town: prop.town,
      price: prop.price,
      beds: prop.beds,
      baths: prop.baths,
      image_url: prop.images[0]?.url,
    }));
  }

  /**
   * Filter XML to only include specified property IDs
   */
  filterXml(xmlString: string, propertyIds: string[]): string {
    const parsed = this.parser.parse(xmlString);
    const root = parsed.root;

    if (!root || !root.property) {
      return xmlString;
    }

    // Ensure properties is always an array
    const properties = Array.isArray(root.property) ? root.property : [root.property];

    // Filter properties
    const filteredProperties = properties.filter((prop: any) => {
      const propId = String(prop.id);
      return propertyIds.includes(propId);
    });

    // Rebuild XML
    const newRoot = {
      root: {
        ...root,
        property: filteredProperties,
      },
    };

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + this.builder.build(newRoot);
  }

  /**
   * Map raw XML property to typed KyeroProperty
   */
  private mapProperty(prop: any): KyeroProperty {
    return {
      id: String(prop.id || ''),
      ref: String(prop.ref || ''),
      date: String(prop.date || ''),
      price: Number(prop.price) || 0,
      currency: String(prop.currency || 'EUR'),
      price_freq: String(prop.price_freq || 'sale'),
      type: String(prop.type || ''),
      town: String(prop.town || ''),
      province: String(prop.province || ''),
      country: String(prop.country || 'Spain'),
      beds: Number(prop.beds) || 0,
      baths: Number(prop.baths) || 0,
      pool: Number(prop.pool) || 0,
      surface_area: {
        built: prop.surface_area?.built ? Number(prop.surface_area.built) : undefined,
        plot: prop.surface_area?.plot ? Number(prop.surface_area.plot) : undefined,
      },
      energy_rating: {
        consumption: String(prop.energy_rating?.consumption || 'X'),
        emissions: String(prop.energy_rating?.emissions || 'X'),
      },
      url: this.parseMultiLang(prop.url),
      desc: this.parseMultiLang(prop.desc),
      features: this.parseFeatures(prop.features),
      images: this.parseImages(prop.images),
      new_build: prop.new_build === '1' || prop.new_build === 1,
      prime: Number(prop.prime) || 0,
      email: String(prop.email || ''),
    };
  }

  private parseMultiLang(obj: any): Record<string, string> {
    if (!obj) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (value && typeof value === 'object' && '#text' in (value as any)) {
        result[key] = String((value as any)['#text']);
      }
    }
    return result;
  }

  private parseFeatures(features: any): string[] {
    if (!features || !features.feature) return [];
    const featureList = Array.isArray(features.feature)
      ? features.feature
      : [features.feature];
    return featureList.map((f: any) => String(f));
  }

  private parseImages(images: any): Array<{ id: string; url: string }> {
    if (!images || !images.image) return [];
    const imageList = Array.isArray(images.image) ? images.image : [images.image];
    return imageList.map((img: any) => ({
      id: String(img['@_id'] || ''),
      url: String(img.url || ''),
    }));
  }
}

export const xmlParser = new XmlParserService();
