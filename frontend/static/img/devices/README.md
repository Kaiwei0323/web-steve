# Device Images

This directory is for storing custom device images used in the dashboard.

## Image Guidelines

For best results, follow these guidelines when adding device images:

- **Format**: PNG or SVG is recommended (PNG preferred for photos, SVG for illustrations)
- **Size**: 300px × 200px recommended
- **Max file size**: Keep under 100KB for optimal performance
- **Background**: Transparent or light background works best
- **Style**: Clean, professional product images

## Naming Convention

Name your images according to the device model with the following conventions:
- Use lowercase
- Replace spaces or special characters with underscores
- Include model number if applicable

Example: For a device with model "Desktech Pro 5000", name the file `desktech_pro_5000.png`

## Custom Type Images

You can also add generic type images that will be used when specific model images aren't available:
- `camera.png` - For camera devices
- `laptop.png` - For notebook/laptop devices
- `desktop.png` - For desktop/PC devices
- `server.png` - For server devices
- `embedded.png` - For embedded/IoT devices
- `default.png` - Default fallback image

If specific model images aren't available, the dashboard will use these type images based on the device category. 