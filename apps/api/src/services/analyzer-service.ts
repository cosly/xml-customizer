import type {
  KyeroProperty,
  PropertySummary,
  FeedAnalytics,
  PriceRange,
  CategoryCount,
  LocationStats,
  SurfaceStats,
} from '@xml-customizer/shared';
import { xmlParser } from './xml-parser';

export class AnalyzerService {
  /**
   * Analyze a feed and generate comprehensive analytics
   */
  analyzeFeed(
    feedId: number,
    feedName: string,
    xmlString: string
  ): FeedAnalytics {
    const properties = xmlParser.parseXml(xmlString);
    const summaries = this.getPropertySummaries(properties);

    return {
      feedId,
      feedName,
      totalProperties: properties.length,
      analyzedAt: new Date().toISOString(),
      metrics: this.calculateMetrics(properties),
      priceDistribution: this.calculatePriceDistribution(properties, summaries),
      typeDistribution: this.calculateTypeDistribution(properties, summaries),
      bedroomDistribution: this.calculateBedroomDistribution(properties, summaries),
      bathroomDistribution: this.calculateBathroomDistribution(properties, summaries),
      locationByTown: this.calculateLocationByTown(properties, summaries),
      locationByProvince: this.calculateLocationByProvince(properties, summaries),
      poolDistribution: this.calculatePoolDistribution(properties, summaries),
      newBuildDistribution: this.calculateNewBuildDistribution(properties, summaries),
      energyRatingDistribution: this.calculateEnergyRatingDistribution(properties, summaries),
      surfaceDistribution: this.calculateSurfaceDistribution(properties, summaries),
      topFeatures: this.calculateTopFeatures(properties, summaries),
    };
  }

  private getPropertySummaries(properties: KyeroProperty[]): Map<string, PropertySummary> {
    const map = new Map<string, PropertySummary>();
    for (const prop of properties) {
      map.set(prop.id, {
        id: prop.id,
        ref: prop.ref,
        type: prop.type,
        town: prop.town,
        price: prop.price,
        beds: prop.beds,
        baths: prop.baths,
        image_url: prop.images[0]?.url,
      });
    }
    return map;
  }

  private getSummariesForIds(
    ids: string[],
    summaryMap: Map<string, PropertySummary>
  ): PropertySummary[] {
    return ids.map((id) => summaryMap.get(id)!).filter(Boolean);
  }

  private calculateMetrics(properties: KyeroProperty[]): FeedAnalytics['metrics'] {
    if (properties.length === 0) {
      return {
        totalValue: 0,
        avgPrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPricePerSqm: 0,
        avgBeds: 0,
        avgBaths: 0,
      };
    }

    const prices = properties.map((p) => p.price).filter((p) => p > 0);
    const sortedPrices = [...prices].sort((a, b) => a - b);

    const totalValue = prices.reduce((sum, p) => sum + p, 0);
    const avgPrice = totalValue / prices.length;

    // Calculate median
    const mid = Math.floor(sortedPrices.length / 2);
    const medianPrice =
      sortedPrices.length % 2 !== 0
        ? sortedPrices[mid]
        : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

    // Calculate average price per sqm
    const propsWithSurface = properties.filter((p) => p.surface_area.built && p.surface_area.built > 0);
    const avgPricePerSqm =
      propsWithSurface.length > 0
        ? propsWithSurface.reduce((sum, p) => sum + p.price / p.surface_area.built!, 0) /
          propsWithSurface.length
        : 0;

    return {
      totalValue,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      minPrice: sortedPrices[0] || 0,
      maxPrice: sortedPrices[sortedPrices.length - 1] || 0,
      avgPricePerSqm: Math.round(avgPricePerSqm),
      avgBeds: Math.round((properties.reduce((sum, p) => sum + p.beds, 0) / properties.length) * 10) / 10,
      avgBaths: Math.round((properties.reduce((sum, p) => sum + p.baths, 0) / properties.length) * 10) / 10,
    };
  }

  private calculatePriceDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): PriceRange[] {
    const ranges: { label: string; min: number; max: number }[] = [
      { label: '€0 - €100k', min: 0, max: 100000 },
      { label: '€100k - €200k', min: 100000, max: 200000 },
      { label: '€200k - €300k', min: 200000, max: 300000 },
      { label: '€300k - €500k', min: 300000, max: 500000 },
      { label: '€500k - €750k', min: 500000, max: 750000 },
      { label: '€750k - €1M', min: 750000, max: 1000000 },
      { label: '€1M - €2M', min: 1000000, max: 2000000 },
      { label: '€2M+', min: 2000000, max: Infinity },
    ];

    return ranges.map((range) => {
      const matchingProps = properties.filter(
        (p) => p.price >= range.min && p.price < range.max
      );
      return {
        label: range.label,
        min: range.min,
        max: range.max === Infinity ? -1 : range.max,
        count: matchingProps.length,
        properties: this.getSummariesForIds(
          matchingProps.map((p) => p.id),
          summaryMap
        ),
      };
    });
  }

  private calculateTypeDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const typeMap = new Map<string, string[]>();

    for (const prop of properties) {
      const type = prop.type || 'Unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(prop.id);
    }

    const total = properties.length;
    return Array.from(typeMap.entries())
      .map(([name, ids]) => ({
        name,
        count: ids.length,
        percentage: Math.round((ids.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(ids, summaryMap),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateBedroomDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const bedMap = new Map<string, string[]>();

    for (const prop of properties) {
      const beds = prop.beds >= 5 ? '5+' : String(prop.beds);
      if (!bedMap.has(beds)) {
        bedMap.set(beds, []);
      }
      bedMap.get(beds)!.push(prop.id);
    }

    const total = properties.length;
    const order = ['0', '1', '2', '3', '4', '5+'];
    return order
      .filter((beds) => bedMap.has(beds))
      .map((beds) => {
        const ids = bedMap.get(beds)!;
        return {
          name: beds === '0' ? 'Studio' : `${beds} bed${beds === '1' ? '' : 's'}`,
          count: ids.length,
          percentage: Math.round((ids.length / total) * 100 * 10) / 10,
          properties: this.getSummariesForIds(ids, summaryMap),
        };
      });
  }

  private calculateBathroomDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const bathMap = new Map<string, string[]>();

    for (const prop of properties) {
      const baths = prop.baths >= 4 ? '4+' : String(prop.baths);
      if (!bathMap.has(baths)) {
        bathMap.set(baths, []);
      }
      bathMap.get(baths)!.push(prop.id);
    }

    const total = properties.length;
    const order = ['0', '1', '2', '3', '4+'];
    return order
      .filter((baths) => bathMap.has(baths))
      .map((baths) => {
        const ids = bathMap.get(baths)!;
        return {
          name: `${baths} bath${baths === '1' ? '' : 's'}`,
          count: ids.length,
          percentage: Math.round((ids.length / total) * 100 * 10) / 10,
          properties: this.getSummariesForIds(ids, summaryMap),
        };
      });
  }

  private calculateLocationByTown(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): LocationStats[] {
    const townMap = new Map<string, { province: string; ids: string[]; prices: number[] }>();

    for (const prop of properties) {
      const town = prop.town || 'Unknown';
      if (!townMap.has(town)) {
        townMap.set(town, { province: prop.province, ids: [], prices: [] });
      }
      townMap.get(town)!.ids.push(prop.id);
      if (prop.price > 0) {
        townMap.get(town)!.prices.push(prop.price);
      }
    }

    return Array.from(townMap.entries())
      .map(([town, data]) => ({
        town,
        province: data.province,
        count: data.ids.length,
        avgPrice:
          data.prices.length > 0
            ? Math.round(data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length)
            : 0,
        properties: this.getSummariesForIds(data.ids, summaryMap),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 towns
  }

  private calculateLocationByProvince(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const provinceMap = new Map<string, string[]>();

    for (const prop of properties) {
      const province = prop.province || 'Unknown';
      if (!provinceMap.has(province)) {
        provinceMap.set(province, []);
      }
      provinceMap.get(province)!.push(prop.id);
    }

    const total = properties.length;
    return Array.from(provinceMap.entries())
      .map(([name, ids]) => ({
        name,
        count: ids.length,
        percentage: Math.round((ids.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(ids, summaryMap),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculatePoolDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const withPool = properties.filter((p) => p.pool === 1);
    const withoutPool = properties.filter((p) => p.pool !== 1);
    const total = properties.length;

    return [
      {
        name: 'Met zwembad',
        count: withPool.length,
        percentage: Math.round((withPool.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(withPool.map((p) => p.id), summaryMap),
      },
      {
        name: 'Zonder zwembad',
        count: withoutPool.length,
        percentage: Math.round((withoutPool.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(withoutPool.map((p) => p.id), summaryMap),
      },
    ];
  }

  private calculateNewBuildDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const newBuild = properties.filter((p) => p.new_build);
    const existing = properties.filter((p) => !p.new_build);
    const total = properties.length;

    return [
      {
        name: 'Nieuwbouw',
        count: newBuild.length,
        percentage: Math.round((newBuild.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(newBuild.map((p) => p.id), summaryMap),
      },
      {
        name: 'Bestaande bouw',
        count: existing.length,
        percentage: Math.round((existing.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(existing.map((p) => p.id), summaryMap),
      },
    ];
  }

  private calculateEnergyRatingDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const ratingMap = new Map<string, string[]>();

    for (const prop of properties) {
      const rating = prop.energy_rating.consumption || 'X';
      if (!ratingMap.has(rating)) {
        ratingMap.set(rating, []);
      }
      ratingMap.get(rating)!.push(prop.id);
    }

    const total = properties.length;
    const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X'];
    return order
      .filter((rating) => ratingMap.has(rating))
      .map((rating) => {
        const ids = ratingMap.get(rating)!;
        return {
          name: rating === 'X' ? 'Onbekend' : `Label ${rating}`,
          count: ids.length,
          percentage: Math.round((ids.length / total) * 100 * 10) / 10,
          properties: this.getSummariesForIds(ids, summaryMap),
        };
      });
  }

  private calculateSurfaceDistribution(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): SurfaceStats[] {
    const ranges: { range: string; min: number; max: number }[] = [
      { range: '0 - 50 m²', min: 0, max: 50 },
      { range: '50 - 100 m²', min: 50, max: 100 },
      { range: '100 - 150 m²', min: 100, max: 150 },
      { range: '150 - 200 m²', min: 150, max: 200 },
      { range: '200 - 300 m²', min: 200, max: 300 },
      { range: '300 - 500 m²', min: 300, max: 500 },
      { range: '500+ m²', min: 500, max: Infinity },
    ];

    return ranges.map((range) => {
      const matchingProps = properties.filter((p) => {
        const built = p.surface_area.built || 0;
        return built >= range.min && built < range.max;
      });

      const prices = matchingProps.filter((p) => p.price > 0);
      const avgPrice =
        prices.length > 0
          ? Math.round(prices.reduce((sum, p) => sum + p.price, 0) / prices.length)
          : 0;

      const withSurface = matchingProps.filter((p) => p.surface_area.built && p.price > 0);
      const pricePerSqm =
        withSurface.length > 0
          ? Math.round(
              withSurface.reduce((sum, p) => sum + p.price / p.surface_area.built!, 0) /
                withSurface.length
            )
          : 0;

      return {
        range: range.range,
        min: range.min,
        max: range.max === Infinity ? -1 : range.max,
        count: matchingProps.length,
        avgPrice,
        pricePerSqm,
        properties: this.getSummariesForIds(matchingProps.map((p) => p.id), summaryMap),
      };
    });
  }

  private calculateTopFeatures(
    properties: KyeroProperty[],
    summaryMap: Map<string, PropertySummary>
  ): CategoryCount[] {
    const featureMap = new Map<string, string[]>();

    for (const prop of properties) {
      for (const feature of prop.features) {
        if (!featureMap.has(feature)) {
          featureMap.set(feature, []);
        }
        featureMap.get(feature)!.push(prop.id);
      }
    }

    const total = properties.length;
    return Array.from(featureMap.entries())
      .map(([name, ids]) => ({
        name,
        count: ids.length,
        percentage: Math.round((ids.length / total) * 100 * 10) / 10,
        properties: this.getSummariesForIds(ids, summaryMap),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 features
  }
}

export const analyzerService = new AnalyzerService();
