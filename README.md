
# **laravel-localeinator**

A React package that enables localization using **Laravel lang files**. This package allows you to dynamically load translations, switch locales, persist the user’s preferred locale, and gracefully fall back to keys when translations are missing.

---

## **Features**

- **Dynamic Locale Switching**: Switch locales dynamically at runtime.
- **Persistent User Preference**: Remember the chosen locale using `localStorage`.
- **Fallback Locale Support**: Automatically load a fallback locale if a key is missing.
- **Translation Keys as Fallback**: Display the translation key if the translation does not exist.
- **Pluralization Support**: Handle plural translations seamlessly.
- **Loading State**: Display a loading state while fetching translations.
- **Available Locales**: Fetch all available locales from the server.

---

## **Installation**

To install the package, run:

```bash
npm install @mcmuffindk/laravel-localeinator
```

By default, this package fetches translations from a Laravel route that serves them as JSON responses. You need to set up your Laravel backend to expose the translations as JSON.

---

## **Laravel Backend Setup**

### **Expose all available languages**
```php
Route::get('/lang/available-locales', function () {
    $langPath = base_path('lang');

    $locales = collect(File::directories($langPath))
        ->map(fn($dir) => basename($dir))
        ->reject(fn($locale) => $locale === 'vendor');

    return response()->json($locales->values());
});
```

### **Expose Lang Files as JSON**:

Add the following routes to `routes/web.php` to serve translations:

#### **Option 1: Serve translations from JSON files**
```php
Route::get('/lang/{locale}', function ($locale) {
    $path = resource_path("lang/$locale.json");
    
    if (!File::exists($path)) {
        abort(404);
    }
    
    return response()->file($path);
}
```

#### **Option 2: Serve translations directly from php files**
```php
Route::get('/lang/{locale}', function ($locale) {
    $langPath = base_path("lang/$locale");

    if (!File::exists($langPath)) {
        abort(404, "Locale not found");
    }

    $translations = collect(File::allFiles($langPath))->reduce(function ($carry, $file) {
        $relativePath = trim($file->getRelativePath(), '/');
        $filename = pathinfo($file->getFilename(), PATHINFO_FILENAME);

        $nestedKeys = array_filter(explode('/', $relativePath));
        $nestedKeys[] = $filename;

        $data = include $file->getPathname();

        $pointer = &$carry;
        foreach ($nestedKeys as $key) {
            if (!isset($pointer[$key])) {
                $pointer[$key] = [];
            }
            $pointer = &$pointer[$key];
        }
        $pointer = $data;

        return $carry;
    }, []);

    return response()->json($translations);
});
```

[//]: # (**Export Laravel Translations as JSON**:)

[//]: # ()
[//]: # (Run the following artisan command to generate JSON translations:)

[//]: # ()
[//]: # (```bash)

[//]: # (php artisan lang:publish)

[//]: # (```)

---

## **Usage**

### **1. Wrap Your Application with `LocalizationProvider`**

Wrap your root component with the `LocalizationProvider` and set the `defaultLocale` and `fallbackLocale`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { LocalizationProvider } from '@mcmuffindk/laravel-localeinator';
import App from './App';

ReactDOM.render(
    <LocalizationProvider defaultLocale="en" fallbackLocale="en">
        <App />
    </LocalizationProvider>,
    document.getElementById('root')
);
```

---

### **2. Use the `useLocalization` Hook**

Access localization features using the `useLocalization` hook in your components:

```jsx
import React from 'react';
import { useLocalization } from '@mcmuffindk/laravel-localeinator';

const MyComponent = () => {
    const { t, switchLocale, locale, loading, availableLocales } = useLocalization();

    if (loading) return <p>Loading translations...</p>;

    return (
        <div>
            <h1>{t('welcome_message', null, { name: 'John' })}</h1>
            <p>Current Locale: {locale}</p>

            <h3>Switch Locale:</h3>
            <button onClick={() => switchLocale('fr')}>French</button>
            <button onClick={() => switchLocale('es')}>Spanish</button>

            <h3>Available Locales:</h3>
            <ul>
                {availableLocales.map((loc) => (
                    <li key={loc}>{loc}</li>
                ))}
            </ul>
        </div>
    );
};

export default MyComponent;
```

[//]: # (---)

[//]: # ()
[//]: # (### **3. Translation JSON File Example**)

[//]: # ()
[//]: # (Example `resources/lang/en.json`:)

[//]: # ()
[//]: # (```json)

[//]: # ({)

[//]: # (    "welcome_message": "Welcome, :name!",)

[//]: # (    "item_count": {)

[//]: # (        "one": "There is one item.",)

[//]: # (        "other": "There are :count items.")

[//]: # (    },)

[//]: # (    "missing_key": "This is a fallback key")

[//]: # (})

[//]: # (```)

[//]: # ()
[//]: # (Example `resources/lang/fr.json`:)

[//]: # ()
[//]: # (```json)

[//]: # ({)

[//]: # (    "welcome_message": "Bienvenue, :name!",)

[//]: # (    "item_count": {)

[//]: # (        "one": "Il y a un article.",)

[//]: # (        "other": "Il y a :count articles.")

[//]: # (    })

[//]: # (})

[//]: # (```)

---

## **API Reference**

### **LocalizationProvider**

Wrap your application in the `LocalizationProvider`.

| Prop              | Type     | Description                                         |
|-------------------|----------|-----------------------------------------------------|
| `defaultLocale`   | `string` | The default locale (e.g., `'en'`).                  |
| `fallbackLocale`  | `string` | The fallback locale when keys are missing.         |

---

### **useLocalization Hook**

Use the `useLocalization` hook to access localization features.

| Property                          | Type        | Description                                           |
|-----------------------------------|-------------|-------------------------------------------------------|
| `t(key, <replacements>, <count>)` | `function` | Translate a key. Supports pluralization and placeholders. |
| `switchLocale(newLocale)`         | `function` | Switch to a new locale.                   |
| `locale`                          | `string`    | The currently active locale.                         |
| `loading`                         | `boolean`   | Indicates whether translations are being loaded.     |
| `availableLocales`                | `array`     | List of all available locales fetched from the server.|

---

### **t Function**

The `t` function supports:

**Simple Translations**:

```jsx
t('welcome_message', 'John'); // Output: "Welcome, John!"
t('welcome_message', { name: 'John' }); // Output: "Welcome, John!"
```

**Simple Pluralization**:

```jsx
t('item_count', 1);  // Output: "There is one item."
t('item_count', 5);  // Output: "There are 5 items."
```

**Complex Pluralization**:

```jsx
people_count = "{0} There are no people.|{1} There is one person.|[2,*] There are :count people."

t('people_count', 0);  // Output: "There are no people."
t('people_count', 1);  // Output: "There is one person."
t('people_count', 5);  // Output: "There are 5 people."
```

**Fallback for Missing Keys**:

If a key is not found in the current locale, the key itself is returned:

```jsx
t('nonexistent_key'); // Output: "nonexistent_key"
```

---

## **Loading State**

You can display a loading indicator while translations are being fetched:

```jsx
if (loading) {
    return <p>Loading translations...</p>;
}
```

---

## **Available Locales**

The available locales can be fetched and displayed using the `availableLocales` property:

```jsx
<ul>
    {availableLocales.map((loc) => (
        <li key={loc}>{loc}</li>
    ))}
</ul>
```

---

## **License**

This package is licensed under the [GNU GPLv3 License](LICENSE).

---

## **Contributing**

Contributions are welcome! If you find a bug or have a suggestion for improvement, please submit an issue or pull request.
