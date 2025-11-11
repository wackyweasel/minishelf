declare module 'sql.js' {
  function initSqlJs(config?: any): Promise<any>;
  export default initSqlJs;
  export type Database = any;
}
