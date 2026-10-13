# Interface reference

The user-supplied `watch-boutique-main.zip` is the visual reference for this frontend. Preserve its existing layouts, spacing, typefaces, light/dark themes, colors and glass effects. Backend integration should not redesign existing screens.

- Keep the existing theme colors from `tailwind.config.js`: background `#050505`, cards `#0a0a0a`, gold `#C5A059`, muted `#888888`.
- Keep Playfair Display for serif text and Montserrat for sans-serif text.
- Preserve the login overlay's `bg-black/40 backdrop-blur-[2px]` and the modal's `backdrop-blur-2xl bg-white/40 dark:bg-theme-bg/50`.
- Preserve the modal's white translucent borders, rounded corners and `shadow-[0_8px_32px_rgba(0,0,0,0.1)]`.
- New features and status messages should reuse these colors, translucent surfaces, borders and blur treatments in both light and dark mode. Do not introduce a different theme.

The complete `App.vue` template and styles match the ZIP, including Sign In, Secure Sign In, Create an Account and Sign In to Checkout. All remaining Vue views and components match the reference too. Keep backend adaptations in the script and composables without redesigning these templates.

The login form retains real backend authentication, server-side email/password validation and session restoration. Demo credentials from the reference are intentionally not prefilled. Authentication failures use the reference's browser-alert behavior; extra inline panels have been removed to preserve the original layout.

Product content is supplied by the backend database. The current demonstration listings and placeholder product pictures are separate from the interface theme.
