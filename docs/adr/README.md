# Architecture Decision Records

One record per significant decision. Never edit a decided ADR — supersede it with
a new one. The value is in the trail, not the current state.

Format: Context → Options → Decision → Consequences.

| # | Title | Status |
|---|---|---|
| [0001](0001-product-thesis.md) | Synchronized social listening as the product thesis | Accepted |
| [0002](0002-backend-stack.md) | Go for core services, TypeScript for BFF and identity | Accepted |
| [0003](0003-catalog-source.md) | Creative Commons seed catalog plus user uploads | Accepted |
| [0004](0004-infrastructure.md) | Docker Compose for development, k3s for production | Accepted |
| [0005](0005-service-decomposition.md) | Five services, shared Postgres with schema-per-service | Accepted |
| [0006](0006-audio-delivery.md) | HLS with AAC, three renditions, two-second segments | Accepted |
| [0007](0007-transactional-outbox.md) | Transactional outbox for all event publishing | Accepted |
| [0008](0008-design-direction.md) | Direction C ("Signal") as the design system, light and dark | Superseded: palette by 0010, visual language by 0012 |
| [0009](0009-timurid-palette.md) | Timurid turquoise as the brand colour | Superseded by 0010 |
| [0010](0010-magenta-palette.md) | Magenta as the brand colour | Superseded by 0013 |
| [0011](0011-rooms-first-ia.md) | Rooms-first information architecture | Accepted |
| [0012](0012-instrument-visual-language.md) | Instrument visual language, dark primary | Accepted |
| [0013](0013-direction-a-night-palette.md) | Direction A's night palette, cyan accent | Accepted |
