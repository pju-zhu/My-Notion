/**
 * 客户端侧「URL 导入 API」契约：失败语义解析、成功体校验、文案截断。
 * 不含 Convex / 路由 / UI，便于单独测试与复用。
 */

export {
  IMPORT_URL_API_PATH,
  requestUrlImportPayload,
} from "./importUrlRequest";
export {
  interpretImportUrlFailure,
  type ImportUrlFailureMessages,
} from "./interpretImportUrlFailure";
export {
  parseImportUrlSuccessBody,
  type ImportUrlSuccessPayload,
} from "./parseImportUrlSuccessBody";
export { shortToastMessage } from "./shortToastMessage";
