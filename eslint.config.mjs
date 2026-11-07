import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import {globalIgnores} from "eslint/config";
const config=[...nextVitals,...nextTs,globalIgnores([".next/**",".test-build/**","out/**","build/**","next-env.d.ts","src/generated/prisma/**"])];
export default config;
