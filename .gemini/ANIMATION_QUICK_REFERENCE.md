# Animation Quick Reference Card

## 🎯 Quick Copy-Paste Classes

### Entrance Animations
```tsx
class="fade-in"              // Fast fade (0.3s)
class="fade-in-slow"         // Slow fade (0.6s)
class="slide-in-left"        // Slide from left
class="slide-in-right"       // Slide from right
class="slide-in-top"         // Slide from top
class="slide-in-bottom"      // Slide from bottom
class="scale-in"             // Scale entrance
```

### Continuous Animations
```tsx
class="pulse-slow"           // Opacity pulse (2s loop)
class="glow-pulse"           // Glow pulse (2s loop)
class="spin"                 // Rotation (1s loop)
class="shimmer-bg"           // Shimmer effect
```

### Hover Effects
```tsx
class="hover-lift"           // Lift up on hover
class="hover-glow"           // Glow on hover
class="hover-scale"          // Scale up on hover
class="hover-rotate"         // Rotate on hover
```

### Transitions
```tsx
class="smooth-transition"       // Fast (0.2s)
class="smooth-transition-slow"  // Slow (0.4s)
```

---

## 💡 Usage Examples

### Button with Lift Effect
```tsx
<button class="smooth-transition hover-lift">
  CLICK ME
</button>
```

### Card with Fade + Hover
```tsx
<div class="fade-in smooth-transition hover-scale">
  Card Content
</div>
```

### Icon with Rotation
```tsx
<span class="hover-rotate">
  <IconComponent />
</span>
```

### Modal/Dialog
```tsx
<div class="scale-in">
  Modal Content
</div>
```

### Loading State
```tsx
<Loader class="spin" />
<span class="pulse-slow">Loading...</span>
```

### List Items
```tsx
<For each={items}>
  {(item) => (
    <div class="fade-in smooth-transition">
      {item}
    </div>
  )}
</For>
```

---

## 🎨 Combining Classes

Combine multiple classes for rich effects:

```tsx
// Fade in + smooth transitions + hover lift
class="fade-in smooth-transition hover-lift"

// Slide + scale
class="slide-in-bottom scale-in"

// Glow pulse + smooth transitions
class="glow-pulse smooth-transition"
```

---

## ⚡ Best Practices

1. **Don't overuse**: Pick 1-2 animations per element
2. **Match context**: Use entrance animations sparingly
3. **Always transition**: Add `smooth-transition` to interactive elements
4. **Test performance**: Avoid animating too many elements at once
5. **Accessibility**: Respect `prefers-reduced-motion`

---

## 🔧 Custom Timing

Override duration in inline styles:
```tsx
<div 
  class="fade-in" 
  style={{ "animation-duration": "1s" }}
>
  Slower fade
</div>
```

Override transition speed:
```tsx
<button 
  class="hover-lift"
  style={{ "transition-duration": "0.5s" }}
>
  Slower lift
</button>
```
