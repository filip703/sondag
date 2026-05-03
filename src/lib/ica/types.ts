// ICA Handla API — privat men stabilt API som ICAs egna appar använder.
// Endpoints och payload-struktur baserade på reverse-engineering från publika OSS-projekt
// (home-assistant ica-component, ica-api wrappers).

export interface IcaAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date; // när access-token går ut
  username: string;
}

export interface IcaShoppingList {
  OfflineId: string;
  Title: string;
  SortingStore?: number;
  Rows: IcaShoppingRow[];
  LatestChange: string;
}

export interface IcaShoppingRow {
  OfflineId: string;
  ProductName: string;
  Quantity?: number;
  SourceId?: number; // 1 = manuellt skriven
  IsStrikedOver?: boolean;
  InternalOrder?: number;
  ArticleGroupId?: number;
  ArticleGroupIdExtended?: number;
  Article?: {
    ArticleId?: number;
    ArticleEan?: string;
  };
}

export interface IcaArticle {
  ArticleId: number;
  ArticleDescription: string;
  ArticleGroupId?: number;
  ArticleGroupIdExtended?: number;
  FormatCategoryId?: number;
  Quantity?: number;
}

export interface IcaStore {
  Id: number;
  Name: string;
  City?: string;
  Address?: string;
}

export class IcaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "IcaApiError";
  }
}
