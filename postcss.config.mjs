/**
 * @module-note postcss.config.mjs
 * 项目构建配置：定义工具运行方式，不是业务请求入口。修改后需按对应工具要求重启或重新构建。
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
