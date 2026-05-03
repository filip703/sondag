import {
  IcaApiError,
  IcaAuthResult,
  IcaShoppingList,
  IcaShoppingRow,
  IcaStore,
} from "./types";

/**
 * IcaClient — wrapper runt handla.api.ica.se
 *
 * ICA har flera publika och privata endpoints. De vi använder:
 *  - https://ims.icagruppen.se/authn/authenticate (autentisering, OAuth-style)
 *  - https://handla.api.ica.se (shopping lists, articles)
 *  - https://api.ica.se/login/v2 (legacy basic-auth, fortfarande aktiv för Handla-app)
 *
 * För enkelhet och stabilitet börjar vi med Basic Auth-flödet mot api.ica.se/login/v2 — det
 * är vad Handla-appens äldre versioner använder och returnerar en sessionstoken.
 */
export class IcaClient {
  private static readonly USER_AGENT =
    process.env.ICA_USER_AGENT || "Sondag/0.1 (kontakt@filiphector.se)";

  private static readonly LOGIN_URL = "https://api.ica.se/login/v2";
  private static readonly HANDLA_BASE = "https://handla.api.ica.se";

  /** Logga in med Mitt ICA-credentials. Returnerar tokens. */
  static async login(username: string, password: string): Promise<IcaAuthResult> {
    const basic = Buffer.from(`${username}:${password}`).toString("base64");

    const res = await fetch(IcaClient.LOGIN_URL, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        "User-Agent": IcaClient.USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new IcaApiError(
        `ICA-login misslyckades (${res.status})`,
        res.status,
        await res.text().catch(() => null)
      );
    }

    const ticket = res.headers.get("AuthenticationTicket");
    if (!ticket) {
      throw new IcaApiError("Ingen AuthenticationTicket i svaret", 500);
    }

    return {
      accessToken: ticket,
      refreshToken: ticket, // ICA:s sessionstoken är långlivad (~månader)
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      username,
    };
  }

  /** Verifiera att en token fortfarande är giltig. */
  static async verify(token: string): Promise<boolean> {
    const res = await fetch(`${IcaClient.HANDLA_BASE}/api/user/minabutiker`, {
      headers: IcaClient.headers(token),
    });
    return res.ok;
  }

  /** Hämta användarens butiker. */
  static async listStores(token: string): Promise<IcaStore[]> {
    const res = await IcaClient.fetch(`${IcaClient.HANDLA_BASE}/api/user/minabutiker`, token);
    const json = (await res.json()) as { Favorites?: IcaStore[] };
    return json.Favorites ?? [];
  }

  /** Hämta alla shopping lists. */
  static async listShoppingLists(token: string): Promise<IcaShoppingList[]> {
    const res = await IcaClient.fetch(
      `${IcaClient.HANDLA_BASE}/api/user/offlineshoppinglists`,
      token
    );
    const json = (await res.json()) as { ShoppingLists?: IcaShoppingList[] };
    return json.ShoppingLists ?? [];
  }

  /** Hämta en specifik lista. */
  static async getShoppingList(token: string, offlineId: string): Promise<IcaShoppingList> {
    const res = await IcaClient.fetch(
      `${IcaClient.HANDLA_BASE}/api/user/offlineshoppinglists/${encodeURIComponent(offlineId)}`,
      token
    );
    return (await res.json()) as IcaShoppingList;
  }

  /** Skapa eller ersätt en shopping list. */
  static async upsertShoppingList(
    token: string,
    list: Omit<IcaShoppingList, "LatestChange"> & { LatestChange?: string }
  ): Promise<IcaShoppingList> {
    const body = {
      ...list,
      LatestChange: list.LatestChange ?? new Date().toISOString(),
    };

    const res = await IcaClient.fetch(
      `${IcaClient.HANDLA_BASE}/api/user/offlineshoppinglists/${encodeURIComponent(list.OfflineId)}`,
      token,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return (await res.json().catch(() => body)) as IcaShoppingList;
  }

  /** Sök efter en artikel via fritext. */
  static async searchArticles(token: string, query: string) {
    const res = await IcaClient.fetch(
      `${IcaClient.HANDLA_BASE}/api/articles/articlesearch?ICAUITypingText=${encodeURIComponent(query)}`,
      token
    );
    return await res.json();
  }

  /** Lookup på EAN-streckkod. */
  static async getArticleByEan(token: string, ean: string) {
    const res = await IcaClient.fetch(
      `${IcaClient.HANDLA_BASE}/api/articles/getarticlebyean?ean=${encodeURIComponent(ean)}`,
      token
    );
    return await res.json();
  }

  // ---- internt ----

  private static headers(token: string): HeadersInit {
    return {
      AuthenticationTicket: token,
      "User-Agent": IcaClient.USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private static async fetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...IcaClient.headers(token), ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      throw new IcaApiError(
        `ICA API ${res.status} på ${url}`,
        res.status,
        await res.text().catch(() => null)
      );
    }
    return res;
  }
}

/** Helper: konvertera Söndags shopping_list_items till ICA-format. */
export function toIcaRows(
  items: { id: string; name: string; quantity: number | null; unit: string | null; ica_ean: string | null; ica_article_id: string | null; checked: boolean }[]
): IcaShoppingRow[] {
  return items.map((it, idx) => ({
    OfflineId: it.id,
    ProductName: it.unit
      ? `${it.name}${it.quantity ? ` ${it.quantity}${it.unit}` : ""}`
      : `${it.name}${it.quantity ? ` x${it.quantity}` : ""}`,
    Quantity: it.quantity ?? 1,
    SourceId: it.ica_article_id ? 0 : 1,
    IsStrikedOver: it.checked,
    InternalOrder: idx,
    Article: it.ica_ean || it.ica_article_id
      ? {
          ArticleEan: it.ica_ean ?? undefined,
          ArticleId: it.ica_article_id ? Number(it.ica_article_id) : undefined,
        }
      : undefined,
  }));
}
