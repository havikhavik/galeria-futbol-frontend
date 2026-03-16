export { getAppPathname, toAppPath } from '../../shared/utils/appPath'

export const routes = {
  home: '/',
  categories: '/categories',
  search: '/search',
  albumDetail: '/albums/:id',
  admin: '/admin',
  adminAlbums: '/admin/albums',
  adminAlbumNew: '/admin/albums/new',
  adminAlbumEdit: '/admin/albums/:id',
  adminCollections: '/admin/collections',
  adminCollectionNew: '/admin/collections/new',
  adminCollectionEdit: '/admin/collections/:id',
  adminLogin: '/login',
} as const
