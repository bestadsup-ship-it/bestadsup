# B2B Ad Tag

Lightweight JavaScript ad serving tag (<10KB gzipped).

## Features

- ✅ Non-blocking asynchronous ad loading
- ✅ 500ms timeout (configurable)
- ✅ Automatic impression tracking
- ✅ No external dependencies
- ✅ Auto-initialization on DOM ready
- ✅ Graceful no-fill handling

## Usage

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Site</title>
</head>
<body>
  <!-- Ad Unit Container -->
  <div class="b2b-ad-unit"
       data-ad-unit-id="YOUR-AD-UNIT-ID"
       data-ad-server="http://localhost:3001">
  </div>

  <!-- Load Ad Tag (before closing body tag) -->
  <script src="/path/to/ad-tag.js"></script>
</body>
</html>
```

### Configuration Options

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-ad-unit-id` | Yes | - | Your ad unit ID from the platform |
| `data-ad-server` | No | `http://localhost:3001` | Ad server URL |
| `data-timeout` | No | `500` | Request timeout in milliseconds |

### Multiple Ad Units

```html
<div class="b2b-ad-unit" data-ad-unit-id="header-banner"></div>
<div class="b2b-ad-unit" data-ad-unit-id="sidebar-ad"></div>
<div class="b2b-ad-unit" data-ad-unit-id="footer-banner"></div>

<script src="/path/to/ad-tag.js"></script>
```

### Manual Initialization

```html
<div id="my-ad" data-ad-unit-id="YOUR-AD-UNIT-ID"></div>

<script src="/path/to/ad-tag.js"></script>
<script>
  // Manually re-initialize (e.g., after dynamic content loads)
  B2BAdTag.init();
</script>
```

## Build & Minify

```bash
# Minify for production
npx terser ad-tag.js -c -m -o ad-tag.min.js

# Check gzipped size (should be < 10KB)
gzip -c ad-tag.min.js | wc -c
```

## Performance

- **Size**: ~2KB minified, ~1KB gzipped
- **Timeout**: 500ms default
- **Non-blocking**: Async loading prevents page blocking
- **No dependencies**: Pure vanilla JavaScript

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- IE11: Not supported (uses modern APIs)
