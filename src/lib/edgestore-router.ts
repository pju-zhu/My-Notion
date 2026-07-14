import { initEdgeStore } from "@edgestore/server";

const es = initEdgeStore.create();

/** 与 `/api/edgestore` 共用同一路由定义，供服务端转存图片等功能使用。 */
export const edgeStoreRouter = es.router({
  publicFiles: es.fileBucket().beforeDelete(() => {
    return true;
  }),
});

export type EdgeStoreRouter = typeof edgeStoreRouter;
