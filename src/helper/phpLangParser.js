import fs from "fs";
import Engine from "php-parser";

const parser = new Engine();

const writeTranslationsToFile = (path, lang, translations) => {

    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.writeFileSync(`${path}/${lang}.json`, JSON.stringify(translations, null, 2));
};

const readTranslationsFromFile = (file) => {
    let langFile = fs.readFileSync(file);
    const parsedFile = parser.parseCode(langFile).children[0].expr.items;
    let translations = {};

    for (let i = 0; i < parsedFile.length; i++) {
        translations[parsedFile[i].key.value] = parsedFile[i].value.value;
    }
    return translations;
};

const getLangFiles = (path) => {
    const langDir = fs.readdirSync(path);
    let files = [];

    for (let i = 0; i < langDir.length; i++) {
        if (fs.statSync(path + '/' + langDir[i]).isDirectory()) {
            let returnedFiles = getLangFiles(path + '/' + langDir[i]);
            files.push({ [langDir[i]]: returnedFiles });
        } else if ((path + '/' + langDir[i]).endsWith('.php')) {
            files.push(langDir[i]);
        }
    }

    return files;
};

const parseLangFiles = (langPath = 'lang') => {
    const langFiles = getLangFiles(langPath);
    let translations = {};

    const setNestedValue = (obj, path, value) => {
        const keys = path.split('.');
        let current = obj;
        keys.forEach((key, index) => {
            if (!current[key]) {
                current[key] = {};
            }
            if (index === keys.length - 1) {
                current[key] = value;
            }
            current = current[key];
        });
    };

    const traverseFiles = (files, parentPath = "") => {
        files.forEach(item => {
            if (typeof item === "string") {
                const dotNotationKey = parentPath
                    ? `${parentPath}.${item.split(".")[0]}`
                    : item.split(".")[0];
                const langFile = `${langPath}/${parentPath ? parentPath.replace(/\./g, '/') + '/' : ''}${item}`;
                const fileContent = readTranslationsFromFile(langFile);
                setNestedValue(translations, dotNotationKey, fileContent);
            } else if (typeof item === "object" && !Array.isArray(item)) {
                for (const [dir, nestedFiles] of Object.entries(item)) {
                    const newParentPath = parentPath ? `${parentPath}.${dir}` : dir;
                    traverseFiles(nestedFiles, newParentPath);
                }
            }
        });
    };

    traverseFiles(langFiles);

    return translations;
};

const getAvailableLanguages = (path) => {
    const langDir = fs.readdirSync(path);
    let languages = [];

    for (let i = 0; i < langDir.length; i++) {
        if (fs.statSync(path + '/' + langDir[i]).isDirectory() && langDir[i] !== 'vendor') {
            languages.push(langDir[i]);
        }
    }

    return languages;
};

export const main = (path = 'lang') => {
    const languages = getAvailableLanguages(path);

    languages.forEach(lang => {
        const translations = parseLangFiles(`${path}/${lang}`);
        writeTranslationsToFile(path, lang, translations);
        console.log(`Successfully parsed "${lang}" translations.`);
    });
};