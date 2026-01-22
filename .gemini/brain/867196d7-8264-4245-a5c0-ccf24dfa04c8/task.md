# Task: Enable Fondo Renta Extract Upload

- [ ] Explore existing extractors and identify the failure point <!-- id: 0 -->
    - [ ] Read `Backend/src/infrastructure/extractors/bancolombia.py` <!-- id: 1 -->
    - [ ] Locate the entry point for `/api/conciliaciones/analizar-extracto` <!-- id: 2 -->
- [ ] Debug `IndentationError` in `fondorenta.py` <!-- id: 4 -->
- [/] Debug extraction failure (400 Bad Request) <!-- id: 5 -->
- [ ] Implement robust summary extraction logic <!-- id: 6 -->
    - [ ] Analyze the PDF format (headers, summary section) <!-- id: 4 -->
    - [ ] Create regex patterns for extraction <!-- id: 5 -->
- [ ] Implement/Update the extractor <!-- id: 6 -->
- [ ] Verify the fix <!-- id: 7 -->
