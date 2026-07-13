# Using Pines UI with Django

Pines components are framework-agnostic HTML — they work in Django templates with no special integration. The only thing to know is how Alpine's `{}` syntax interacts with Django's `{{ }}` and `{% %}` tags.

## The base template

Use `templates/base_django.html` (in this skill) as `templates/base.html` in your Django project. It loads Tailwind + Alpine + the focus and collapse plugins from CDN and provides `{% block content %}` and `{% block extra_js %}`.

## Template syntax conflicts

Django uses `{{ var }}` and `{% tag %}`. Alpine uses `x-data="{ key: value }"`. There's no actual conflict because Alpine's `{}` is inside an HTML attribute string, but two situations need care:

1. **`x-text` with a Django variable.** Don't write `x-text="{{ user.name }}"` — Django substitutes server-side, then Alpine tries to evaluate the result as a JavaScript expression and crashes if the name has a quote or space. Pass through `x-data` instead:

   ```django
   <div x-data="{ name: '{{ user.name|escapejs }}' }">
       <span x-text="name"></span>
   </div>
   ```

   `|escapejs` properly escapes for a JS string literal.

2. **Looping templated content.** Server-render the loop with `{% for %}` and let Alpine handle interactivity per item:

   ```django
   {% for product in products %}
       <div x-data="{ open: false }">
           <button @click="open = !open">{{ product.name }}</button>
           <div x-show="open">{{ product.description }}</div>
       </div>
   {% endfor %}
   ```

   Each iteration gets its own independent Alpine scope.

## Forms and CSRF

Pines components are presentational; they don't replace Django forms. Wrap a Pines-styled input/button in a normal `<form method="post">` with `{% csrf_token %}`.

```django
<form method="post" class="space-y-4">
    {% csrf_token %}
    <!-- Paste a Pines text-input snippet here, set name="email" on the <input> -->
    <!-- Paste a Pines button snippet here, set type="submit" -->
</form>
```

For AJAX submits (e.g., with Alpine's `fetch`), include the CSRF token in headers:

```javascript
fetch('/api/endpoint', {
    method: 'POST',
    headers: {
        'X-CSRFToken': '{{ csrf_token }}',
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
})
```

## htmx + Pines

Pines plays well with htmx. Use Pines for client-side interactions (open/close, animations, focus traps) and htmx for server round-trips. They don't fight — htmx swaps DOM, and Alpine re-initializes any new `x-data` islands automatically.

## Reusable component as an `{% include %}`

Wrap a Pines snippet in its own template file and parameterize it:

```django
{# templates/partials/_alert.html #}
<div class="relative w-full rounded-lg border bg-white p-4 ...">
    <h5 class="mb-1 font-medium leading-none tracking-tight">{{ title }}</h5>
    <div class="text-sm opacity-70">{{ message }}</div>
</div>
```

```django
{% include "partials/_alert.html" with title="Saved" message="Your changes were saved." %}
```

This is the lightest reusability pattern. For more complex cases, look at django-cotton or django-template-partials.

## Production note

The CDN setup is meant for prototyping and small projects. For larger Django apps, use a real Tailwind build (e.g., `django-tailwind`) so unused classes are purged and the CSS is fingerprinted by `collectstatic`.
