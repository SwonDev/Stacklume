# Color Palette Widget

An advanced color palette generator widget for web designers with harmonious color generation, color locking, and export functionality.

## Features

### Color Harmonies
Generate professional color palettes using 6 different color harmony modes:
- **Complementary**: Colors opposite each other on the color wheel
- **Analogous**: Colors adjacent to each other on the color wheel
- **Triadic**: Three colors evenly spaced around the color wheel
- **Tetradic**: Four colors forming a rectangle on the color wheel
- **Split Complementary**: Base color plus two colors adjacent to its complement
- **Monochromatic**: Various shades, tints, and tones of a single hue

### Base Color Selection
- **Color Picker**: Visual color picker for precise color selection
- **HEX Input**: Manual HEX color code entry
- **Shuffle Button**: Randomly generate a new base color

### Color Display
Each of the 5 generated colors displays:
- **HEX**: Uppercase HEX value (e.g., #3B82F6)
- **RGB**: RGB format (e.g., rgb(59, 130, 246))
- **HSL**: HSL format (e.g., hsl(217, 91%, 60%))
- **Color Swatch**: Large visual preview of the color
- **One-click Copy**: Click any format to copy to clipboard

### Color Locking
- **Lock Individual Colors**: Click the lock icon on any color to preserve it during regeneration
- **Regenerate Unlocked**: Generate new colors while keeping locked ones fixed
- Perfect for iterating on a palette while preserving colors you like

### Palette Management
- **Save Palettes**: Save your favorite color combinations with custom names
- **Favorite System**: Mark palettes as favorites for quick access
- **Load Saved Palettes**: Restore any saved palette with one click
- **Delete Palettes**: Remove unwanted palettes
- **Palette Preview**: Visual strip showing all colors in saved palettes
- **Harmony Labels**: Each saved palette shows its harmony type

### Export Options
Three export formats for seamless integration:
1. **Copy All**: Copy all HEX colors as comma-separated values
2. **CSS Variables**: Export as CSS custom properties
   ```css
   :root {
     --color-1: #3B82F6;
     --color-1-rgb: 59, 130, 246;
     /* ... */
   }
   ```
3. **Tailwind Config**: Export as Tailwind CSS theme configuration
   ```js
   module.exports = {
     theme: {
       extend: {
         colors: {
           palette: {
             1: '#3B82F6',
             /* ... */
           },
         },
       },
     },
   }
   ```

### User Interface
- **Responsive Design**: Uses @container queries for optimal sizing
- **Smooth Animations**: Motion-powered transitions and visual feedback
- **Toast Notifications**: Success messages for all actions
- **Tab Interface**: Switch between Generator and Saved palettes
- **Hover States**: Interactive elements reveal controls on hover
- **Empty States**: Helpful guidance when no palettes are saved

## Usage

### Generating a Palette
1. Select a base color using the color picker or HEX input
2. Choose a harmony type from the dropdown (Complementary, Analogous, etc.)
3. The widget generates 5 harmonious colors automatically
4. Click any color value (HEX, RGB, HSL) to copy it

### Refining a Palette
1. Lock colors you want to keep by clicking the lock icon on the color swatch
2. Click "Regenerate" to create new colors while preserving locked ones
3. Or use the shuffle button to randomize the base color

### Saving Palettes
1. When you have a palette you like, click the "Save" button
2. Give it a descriptive name (or use the auto-generated name)
3. Click "Save Palette" to add it to your collection

### Exporting Colors
- **Copy All**: Get all HEX codes in one string
- **CSS**: Get formatted CSS variables ready to paste
- **Tailwind**: Get Tailwind config code for your project

## Widget Configuration

The widget saves its state to localStorage through the widget store, including:
- Current palette colors
- Locked color states
- Selected harmony type
- Base color
- All saved palettes with favorites

## Technical Details

### Color Conversions
- Accurate HEX ↔ RGB ↔ HSL conversions
- Proper HSL color space calculations for harmonies
- Handles edge cases and color space boundaries

### Persistence
- Uses Zustand widget store for state management
- Automatic config updates on changes
- Preserves locked states during regeneration

### Performance
- Lazy loaded via LazyWidgets system
- Efficient re-renders with proper React optimization
- Smooth animations with Motion

## File Structure

- `ColorPaletteWidget.tsx`: Main widget component
- `src/types/color-palette.ts`: TypeScript types for enhanced palette features
- Widget registered in `LazyWidgets.tsx` and `widget.ts`

## Future Enhancements

Potential additions:
- Custom harmony rules
- Color accessibility checker (WCAG contrast)
- Palette import from URL or image
- More export formats (SCSS, LESS, JSON)
- Color name generation (descriptive names)
- Gradient previews
- Color blindness simulation
