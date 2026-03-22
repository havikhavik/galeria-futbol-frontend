import { authFetchJson } from "../../../shared/api/authFetch"
import { httpClient } from "../../../shared/api/httpClient"
import type { PageResponse } from "../../../shared/types/common"
import type {
  FeaturedCollectionAdminApi,
  FeaturedCollectionCreateRequest,
  FeaturedCollectionPatchRequest,
  FeaturedCollectionWithAlbumsApi,
} from "../../../shared/types/collections"

type UploadImageApi = {
  url?: string
}

let createDraftInFlight: Promise<FeaturedCollectionAdminApi> | null = null

function isReusableDraftCollection(collection: FeaturedCollectionAdminApi): boolean {
  const title = (collection.title ?? "").trim().toLowerCase()
  const slug = (collection.slug ?? "").trim().toLowerCase()

  return !collection.active && (title === "draft" || slug.startsWith("draft-"))
}

export type AdminCollectionCard = {
  id: number
  name: string
  description?: string
  itemCount: number
  active: boolean
  priority: number
  startDate: string
  endDate: string
  bannerImage?: string
}

export async function fetchAdminCollections(): Promise<AdminCollectionCard[]> {
  const collections = await httpClient.getJson<FeaturedCollectionAdminApi[]>(
    "admin/featured-collections",
  )

  return (collections ?? []).map((collection) => ({
    id: collection.id,
    name: collection.title,
    description: collection.description ?? undefined,
    itemCount: collection.albumCount ?? 0,
    active: collection.active,
    priority: collection.priority,
    startDate: collection.startDate,
    endDate: collection.endDate,
    bannerImage: collection.bannerImage,
  }))
}

export async function deleteAdminCollection(id: number): Promise<void> {
  await httpClient.deleteJson<void>(`admin/featured-collections/${id}`)
}

export async function fetchFeaturedCollectionById(
  id: number,
): Promise<FeaturedCollectionAdminApi | null> {
  try {
    return await httpClient.getJson<FeaturedCollectionAdminApi>(
      `admin/featured-collections/${id}`,
    )
  } catch {
    const collections = await httpClient.getJson<FeaturedCollectionAdminApi[]>(
      "admin/featured-collections",
    )
    return collections.find((item) => item.id === id) ?? null
  }
}

export async function fetchFeaturedCollectionAlbumsById(
  id: number,
  slug?: string,
): Promise<FeaturedCollectionWithAlbumsApi["albums"]> {
  try {
    return await httpClient.getJson<FeaturedCollectionWithAlbumsApi["albums"]>(
      `admin/featured-collections/${id}/albums`,
    )
  } catch {
    if (!slug) {
      throw new Error("COLLECTION_ALBUMS_ENDPOINT_UNAVAILABLE")
    }
    const details = await httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
      `featured/${slug}`,
    )
    return details.albums ?? []
  }
}

export async function createFeaturedCollection(
  payload: FeaturedCollectionCreateRequest,
): Promise<FeaturedCollectionAdminApi> {
  return httpClient.postJson<FeaturedCollectionAdminApi, FeaturedCollectionCreateRequest>(
    "admin/featured-collections",
    payload,
  )
}

export async function createFeaturedCollectionDraft(): Promise<FeaturedCollectionAdminApi> {
  return httpClient.postJson<FeaturedCollectionAdminApi, Record<string, never>>(
    "admin/featured-collections/draft",
    {},
  )
}

export async function getOrCreateFeaturedCollectionDraft(): Promise<FeaturedCollectionAdminApi> {
  const collections = await httpClient.getJson<FeaturedCollectionAdminApi[]>(
    "admin/featured-collections",
  )

  const reusableDraft = (collections ?? [])
    .filter(isReusableDraftCollection)
    .sort((left, right) => right.id - left.id)[0]

  if (reusableDraft) {
    return reusableDraft
  }

  if (!createDraftInFlight) {
    createDraftInFlight = createFeaturedCollectionDraft().finally(() => {
      createDraftInFlight = null
    })
  }

  return createDraftInFlight
}

export async function patchFeaturedCollection(
  collectionId: number,
  payload: FeaturedCollectionPatchRequest,
): Promise<FeaturedCollectionAdminApi> {
  return httpClient.patchJson<FeaturedCollectionAdminApi, FeaturedCollectionPatchRequest>(
    `admin/featured-collections/${collectionId}`,
    payload,
  )
}

export async function addAlbumToFeaturedCollection(
  collectionId: number,
  albumId: number,
): Promise<void> {
  await httpClient.postJson<void, Record<string, never>>(
    `admin/featured-collections/${collectionId}/albums/${albumId}`,
    {},
  )
}

export async function removeAlbumFromFeaturedCollection(
  collectionId: number,
  albumId: number,
): Promise<void> {
  await httpClient.deleteJson<void>(
    `admin/featured-collections/${collectionId}/albums/${albumId}`,
  )
}

export async function uploadFeaturedBanner(
  collectionId: number,
  file: File,
): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await authFetchJson<UploadImageApi>(
    httpClient.buildUrl(`admin/upload/featured-banner/${collectionId}`),
    {
      method: "POST",
      body: formData,
    },
  )

  if (!response.url) {
    throw new Error("UPLOAD_BANNER_MISSING_URL")
  }

  return response.url
}

export async function searchAdminAlbums(
  query: string,
  page = 0,
  size = 8,
): Promise<PageResponse<{ id: number; title: string; thumbnail?: string | null }>> {
  return httpClient.getJson<PageResponse<{ id: number; title: string; thumbnail?: string | null }>>(
    `admin/albums?page=${page}&size=${size}&q=${encodeURIComponent(query)}`,
  )
}
