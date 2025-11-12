# Common Anti-Patterns

## Service Type

1. **Missing @context**: Always include `"@context": "https://schema.org"`
2. **Using aggregateRating**: Not recommended for Service type
3. **Missing name**: Required field, must be present
4. **Provider without @type**: Provider must specify @type (Organization or LocalBusiness)
5. **Too many areaServed**: Limit to 3 most relevant areas
6. **Keyword stuffing in name**: Keep names natural and readable

## General

1. **HTTP URLs**: Always use HTTPS
2. **Relative URLs**: Use absolute URLs for better compatibility
3. **Missing descriptions**: Always include a description for better SEO

