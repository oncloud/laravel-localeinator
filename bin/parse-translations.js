#!/usr/bin/env node
import { main } from '../src/helper/phpLangParser.js';

const args = process.argv.slice(2);
const langPath = args[0] || 'lang';

main(langPath);