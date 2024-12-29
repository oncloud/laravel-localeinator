import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const LocalizationContext = createContext(undefined, undefined);

export const LocalizationProvider = ({ children, defaultLocale = 'en', fallbackLocale = 'en' }) => {
    const [locale, setLocale] = useState(localStorage.getItem('locale') || defaultLocale);
    const [translations, setTranslations] = useState({});
    const [loading, setLoading] = useState(false);
    const [availableLocales, setAvailableLocales] = useState([]);

    const loadLocale = useCallback(async (newLocale) => {
        setLoading(true);
        try {
            const response = await axios.get(`/lang/${newLocale}`);
            setTranslations(response.data);
            setLocale(newLocale);
            localStorage.setItem('locale', newLocale);
        } catch (error) {
            console.error(`Failed to load translations for locale: ${newLocale}`, error);
            if (newLocale !== fallbackLocale) {
                await loadLocale(fallbackLocale);
            }
        } finally {
            setLoading(false);
        }
    }, [fallbackLocale]);

    const fetchAvailableLocales = useCallback(async () => {
        try {
            const response = await axios.get('/lang/available-locales');
            setAvailableLocales(response.data || []);
        } catch (error) {
            console.error('Failed to fetch available locales', error);
        }
    }, []);

    const switchLocale = async (newLocale) => {
        if (newLocale !== locale) {
            await loadLocale(newLocale);
        }
    };

    const t = (key, variables = {}, count = null) => {
        const resolveKey = (obj, path) => {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };

        let translation = resolveKey(translations, key) || key;

        if (typeof variables === 'number') {
            count = variables;
            variables = {};
        }

        if ((typeof variables === 'string' || typeof variables === 'number') && count !== null) {
            const firstPlaceholderMatch = translation?.match(/:([a-zA-Z0-9_]+)/);
            if (firstPlaceholderMatch) {
                const firstPlaceholder = firstPlaceholderMatch[1];
                variables = { [firstPlaceholder]: variables };
            }
        }

        if (count !== null && translation.includes('|')) {
            const parts = translation.split('|');
            let selectedPart = parts[parts.length - 1];

            for (let part of parts) {
                const match = part.match(/^\{(\d+)\}|\[(\d+),(\d+|\*)\]/);
                if (match) {
                    const [_, exact, start, end] = match;
                    if (exact && parseInt(exact) === count) {
                        selectedPart = part.replace(/^\{\d+\}/, '').trim();
                        break;
                    } else if (start !== undefined) {
                        const startNum = parseInt(start);
                        const endNum = end === '*' ? Infinity : parseInt(end);
                        if (count >= startNum && count <= endNum) {
                            selectedPart = part.replace(/^\[\d+,\*?\d*\]/, '').trim();
                            break;
                        }
                    }
                } else if (parts.length === 2) {
                    selectedPart = count === 1 ? parts[0].trim() : parts[1].trim();
                    break;
                }
            }
            translation = selectedPart;
        }

        translation = translation.replace(/:([a-zA-Z0-9_]+)/g, (_, placeholder) => {
            if (
                typeof variables === 'object' &&
                variables.hasOwnProperty(placeholder)
            ) {
                return variables[placeholder];
            } else if (typeof variables === 'string' || typeof variables === 'number') {
                return variables;
            } else if (placeholder === 'count' && count !== null) {
                return count;
            } else {
                console.warn(
                    `Missing value for placeholder ":${placeholder}" in key "${key}".`
                );
                return `:${placeholder}`;
            }
        });

        return translation;
    };

    useEffect(() => {
        loadLocale(locale);
        fetchAvailableLocales();
    }, [loadLocale, fetchAvailableLocales]);

    return (
        <LocalizationContext.Provider
            value={{
                locale,
                switchLocale,
                t,
                loading,
                availableLocales,
                fallbackLocale,
            }}
        >
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = () => React.useContext(LocalizationContext);