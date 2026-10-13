# Estrategia comercial, modelo de negocio y análisis competitivo

**Fecha inicial de referencia:** 13 de octubre de 2026.  
**Ámbito:** documento estratégico interno; separa decisiones confirmadas, hipótesis y objetivos. No constituye una promesa comercial ni una lista de funcionalidades entregadas.

## Cómo usar este documento

Este es el contexto de referencia para decisiones de producto, arquitectura, experiencia, precios y prioridades. Ante un conflicto, prevalecen la evidencia del repositorio, las condiciones comerciales vigentes y las instrucciones explícitas más recientes. Las tarifas externas cambian: antes de una decisión de precio deben volver a confirmarse en la fuente enlazada.

## A. Visión del negocio

Estamos construyendo una plataforma SaaS B2B, autoadministrable e inicialmente enfocada en Argentina, para concesionarias de autos y motos. Convierte fotos comunes de vehículos en imágenes profesionales listas para publicar en Mercado Libre, Instagram, Facebook Marketplace, sitios propios y otros canales digitales.

> **Propuesta de valor:** “Convertí las fotos de tus vehículos en imágenes profesionales, listas para publicar, sin contratar fotógrafos ni preparar un showroom”.

El producto debe ser fácil de usar desde celular, apto para lotes, accesible para agencias chicas y escalable para cuentas de mayor volumen. La calidad y la fidelidad son requisitos de negocio: nunca se debe alterar accidentalmente carrocería, pintura, llantas, ópticas, accesorios, daños visibles o proporciones. Cada resultado generado requiere revisión humana hasta que exista evidencia suficiente para cambiar esa política.

## Estado real del producto al 13/10/2026

| Área | Evidencia actual | Estado comercial |
|---|---|---|
| Edición avanzada | Arquitectura server-side para Image Edit de OpenAI, jobs persistentes con `pg-boss`, almacenamiento privado y costos estimados/reconciliables. | Base técnica existente; la generación real requiere autorización explícita y sus resultados siguen sin verificar. |
| Fidelidad y revisión | Metodología de evaluación separa realismo, fidelidad física, daños, ruedas, sombras, patentes y aptitud para marketplace. | Implementada como metodología; no es una garantía automática. |
| Patentes | Laboratorio de superadministración para comparar detectores locales, métricas y blur/pixelado/cobertura deterministas. Los modelos YOLO actuales son sólo de evaluación. | En desarrollo/validación; no es aún edición básica comercial ni detector aprobado para producción. |
| Portal y lotes | Hay UI inicial de portal, carga y resumen de lote; las pantallas declaran estados vacíos o procesamiento deshabilitado. | Base de experiencia, no flujo comercial operativo de punta a punta. |
| Créditos y pagos | Existen pantallas de maqueta y lugares administrativos para créditos/reembolsos; no hay persistencia de movimientos ni proveedor de pagos configurado. | Pendiente. |
| API pública | Hay contrato y endpoints base; el middleware de API key es requisito previo para exponerla comercialmente. | No disponible comercialmente. |

Fuentes internas: [arquitectura](architecture.md), [laboratorio local de patentes](local-plate-detection-lab.md), [metodología de evaluación](evaluation-methodology.md), [contabilidad de costos](cost-accounting.md), [roadmap técnico](roadmap.md) y [contrato de API](api-contract.md).

## B. Clientes objetivo

Prioridad inicial:

1. Agencias multimarca pequeñas y medianas, con aproximadamente 10 a 60 vehículos en stock.
2. Concesionarias de usados de mayor volumen.
3. Concesionarias y agencias de motos.
4. Grandes cadenas y grupos automotrices en etapas posteriores.

El cliente ideal publica fotos regularmente, usa celulares y sufre una presentación visual inconsistente del inventario. El decisor probable es el dueño, gerente comercial o encargado de publicaciones. La primera venta no debe depender de integraciones empresariales complejas.

## C. Modelo de producto

### Edición básica

Objetivo: edición rápida y económica sin IA generativa ni APIs externas pagas por inferencia. Las opciones técnicas a validar incluyen Sharp, OpenCV, ONNX Runtime, Node.js y, donde corresponda, servicios Python locales.

| Función objetivo | Regla de producto |
|---|---|
| Detección y ocultamiento de patente | El flujo habitual debe detectar automáticamente y aplicar blur, pixelado o cobertura sólo en las regiones encontradas. No debe exigir marcado manual. |
| Incertidumbre de detección | Una ausencia de detecciones no equivale a “sin patente”. Deben existir señalización, revisión y corrección para regiones dudosas. |
| Mejoras conservadoras | Iluminación, contraste, balance de blancos, nitidez moderada, encuadre, redimensionado y branding determinístico. |
| Costos | Un modelo local de visión puede ser IA, pero no IA generativa ni una API paga por inferencia. Deben medirse CPU, almacenamiento y tiempo real. |

El laboratorio actual satisface parte de la investigación, no la promesa comercial: permite evaluar detectores locales y aplicar efectos deterministas, pero sus pesos actuales no están aprobados para producción.

### Edición avanzada

Objetivo: imágenes de mayor valor comercial mediante OpenAI: reemplazo de fondo por showroom, fondos precargados o fotos del local, integración de luz y sombras, branding y personalización. La identidad real del vehículo es prioritaria frente al efecto visual. Las capacidades sólo se comunicarán como disponibles tras validación técnica, revisión humana y autorización de costo.

## D. Modelo de monetización

La hipótesis preferida es crédito prepago por imagen final, sin suscripción mensual obligatoria.

- El cliente compra saldo y cada consumo se define explícitamente por operación o por categoría de crédito; no se debe asumir que básica y avanzada consumen igual.
- Los créditos comprados idealmente no vencen. Fallas técnicas no deben consumirlos de forma definitiva.
- Regeneraciones, correcciones, devoluciones y expiración deben tener una política visible, versionada y auditable antes de cobrar.
- Evaluar cinco imágenes de prueba gratuitas con controles antifraude, límites por identidad/organización y auditoría; no lanzar la prueba sin definir esos controles.

| Servicio | Precio orientativo por imagen final | Estado |
|---|---:|---|
| Edición básica | US$0,10 | Hipótesis para validar. |
| Edición avanzada | US$0,50 | Hipótesis para validar. |
| Edición avanzada por volumen | US$0,35–0,40 | Hipótesis para validar. |

No son precios aprobados ni compromisos. Un paquete prepago y una suscripción mensual no son equivalentes: para una suscripción, el valor unitario sólo es comparable suponiendo uso total del cupo.

## E. Investigación de competidores

Consulta realizada el 13/10/2026. “Oficial” significa que la información proviene del sitio del proveedor; “tercero” requiere reconfirmación contra la oferta efectiva. Los unitarios se calculan sólo sobre cupos publicados y usados íntegramente; no se convierten monedas ni se equiparan planes mensuales con créditos prepagos.

| Competidor | Mercado y funcionalidades relevantes | Cobro, precio, cupo y unitario | Prueba | Diferencial / oportunidad para nuestro SaaS | Fuente y estado |
|---|---|---|---|---|---|
| Fotcar | Fotos de showroom, fondo, luz/color y marca para autos. | Prepago: 30 fotos por EUR 24; EUR 0,80/foto; créditos sin vencimiento. | 3 fotos. | Validar créditos sin vencimiento, precio básico local y flujo simple para Argentina/motos. | [Sitio y precios](https://fotcar.com/) — oficial. |
| Car Studio AI | Fondos, branding, mascarado de patente; fondos/logo propios en planes superiores. | Mensual: Starter US$30,99/100 (US$0,310); Pro US$84,99/300 (US$0,283); Enterprise US$156,99/600 (US$0,262). | La página describe prueba, pero sus condiciones no se publican claramente. | Ofrecer compra sin suscripción y prueba autoadministrable, si se valida. | [Pricing](https://carstudio.ai/pricing) — oficial. |
| CarPixAI | Edición de fotos existentes, procesamiento por lotes, fondos, branding y ocultamiento de patente. | Mensual: Starter US$19/50 (US$0,380); Professional US$69/200 (US$0,345); Business US$149/500 (US$0,298). | 5 fotos, sin tarjeta. | Foco en Argentina, patentes locales, autos y motos, créditos prepagos y fondos del concesionario. | [Pricing](https://carpixai.com/pricing) — oficial. |
| CarBG / Car Background AI | Remoción/cambio de fondo, mejora, lotes, branding y blur de patente. | El sitio anuncia planes desde US$29/mes y US$0,17/foto a volumen, sin paquete/cupo comparable en la página consultada. Referencia histórica de tercero: 100 US$39,99; 500 US$175; 1.000 US$299,99; 5.000 US$999,99 (US$0,400/0,350/0,300/0,200). | 10 generaciones sin tarjeta. | Medir calidad y costo local sin competir sólo por precio; no usar la referencia de tercero como oferta actual. | [Sitio](https://carbackground.ai/) — oficial; [Capterra](https://www.capterra.com/p/10037534/CarBG/pricing/) — tercero, no revalidado. |
| MotorCut | Fondos, branding, cobertura de patente, upscale, app móvil; API según plan. | Mensual: Core US$50/80 (US$0,625); Starter US$100/160 (US$0,625); Silver US$200/360 (US$0,556); Gold US$275/600 (US$0,458); Platinum US$400/1.200 (US$0,333). Las funcionalidades varían por plan. | “Try for free”; condiciones no detalladas. | Experiencia móvil/lote y transparencia sobre qué incluye cada nivel. | [Pricing](https://motorcut.com/pricing/) — oficial. |
| Motuva | Fotos desde celular, estudio/marca/placa, lotes, web/móvil y API en planes superiores. | Mensual en GBP: Free 20 imágenes; Pro GBP49/150 (GBP0,327); Ultra GBP99 ilimitado (sin unitario comparable). | Plan free de 20 imágenes/mes. | Nuestra oportunidad es el foco argentino y prepago; no comparar sus GBP ni el plan ilimitado con nuestro unitario. | [Sitio y precios](https://motuva.com/) — oficial. |
| Autofox | Fotografía y optimización de imagen para concesionarias. | Precio no publicado / requiere cotización. | Requiere confirmar. | Investigar su captura guiada e integración antes de priorizar esas áreas. | [Sitio](https://www.autofox.ai/) — oficial. |
| CarCutter | Solución de edición profesional para fotos de autos. | Precio no publicado / requiere cotización. | Requiere confirmar. | Comparar especialmente operación asistida, SLA e integración antes de apuntar a enterprise. | [Sitio](https://carcutter.com/) — sitio oficial, precio no verificable en la consulta. |
| Spyne | Suite automotriz de foto/video/360 y merchandising. | Precio no publicado / requiere cotización. | Requiere confirmar. | No expandir hacia 360 o video sin demanda validada; mantener el foco inicial en fotos fijas y lotes. | [Sitio](https://www.spyne.ai/) — oficial. |

No se publican precios de Argentina o Latinoamérica comparables en las fuentes consultadas. Deben investigarse propuestas locales antes de fijar precios por país.

## F. Posicionamiento y diferenciación

No competir exclusivamente por precio. Diferenciales a desarrollar y validar: especialización en concesionarias argentinas; autos y motos; patentes argentinas antiguas y Mercosur; básica económica sin IA generativa; avanzada premium con OpenAI; lotes; interfaz muy simple; créditos sin suscripción obligatoria; fondos propios; fidelidad del vehículo; revisión de errores y soporte local en español. Ninguno debe presentarse como logrado sin evidencia de implementación y validación.

## G. Estrategia de adquisición de clientes

Empezar por ventas directas y validación: localizar agencias con fotos mejorables, contactar responsables comerciales, mostrar antes/después autorizados, ofrecer prueba, conseguir compras y medir recompra. Canales: WhatsApp, Instagram, Google Maps, Mercado Libre como fuente de identificación, referidos y landing propia. Respetar términos, privacidad y derechos sobre fotos; no automatizar spam ni scraping contrario a las condiciones aplicables.

Objetivo inicial: **10 concesionarias que paguen y usen regularmente el producto**.

| Embudo y salud | Métricas |
|---|---|
| Adquisición | Leads contactados, respuestas, demostraciones, registros y pruebas activadas. |
| Conversión | Primera compra, tasa prueba→primera compra e ingresos por concesionaria. |
| Uso y retención | Consumo de imágenes, segunda compra, retención, cancelaciones e inactividad. |

## H. Experiencia de usuario como prioridad

Flujo ideal: entrar al portal, subir un lote, elegir Básica o Avanzada, activar pocas opciones claras, procesar, revisar resultados y descargar todo. No exponer prompts, thresholds, parámetros de modelos ni otros detalles de laboratorio. Los valores predeterminados deben ser buenos y las opciones avanzadas deben aparecer sólo cuando aporten valor. La revisión de fidelidad y de patentes debe ser comprensible, no técnica.

## I. Unit economics

Medir por imagen entregada: costo real de OpenAI, reintentos/regeneraciones, CPU básica, Object Storage, tráfico, PostgreSQL, procesamiento por lotes, comisión de pago, impuestos, soporte, reembolsos e infraestructura fija. Distinguir siempre facturación, costo variable, margen de contribución, gastos fijos y beneficio.

Para una avanzada de US$0,50, la meta de ingeniería y rentabilidad es costo variable total menor o igual a US$0,20 por imagen entregada. No es un costo ni margen alcanzado. Mantener la reserva y conciliación de costos existente; una estimación previa nunca equivale a facturación real.

## J. Roadmap comercial y prioridades

| Etapa | Prioridades |
|---|---|
| Primera | Validar calidad real; completar laboratorio de patentes; medir costos; conseguir flujo básico por lotes; validar operaciones de edición básica. |
| Segunda | Consolidar avanzada; implementar créditos y pagos; habilitar pruebas; lanzar mínimo comercial; incorporar primeros clientes. |
| Tercera | Mejorar conversión y recompra; optimizar costos; automatizar soporte/correcciones; mejorar lotes; sumar funciones justificadas por demanda. |
| Posterior | API para terceros, integraciones con sistemas de concesionarias, cuentas enterprise, revendedores/socios y expansión regional. |

Es un roadmap comercial orientativo. Debe contrastarse con el estado de implementación de este documento antes de comprometer fechas o funcionalidades.

## K. Riesgos y mitigaciones

| Riesgo | Mitigación concreta |
|---|---|
| Competencia bajo US$0,50 y baja diferenciación | Pruebas con clientes locales, propuesta centrada en calidad/fidelidad/soporte y unit economics antes de bajar precio. |
| Alteración generativa del vehículo | Original inmutable, comparación/revisión, resultados inicialmente no verificados y ruta de corrección. |
| Patente no detectada | Umbrales medidos con ground truth, estado “no verificado”, revisión y corrección manual. |
| Regeneraciones costosas | Límites, idempotencia, registro de causa y política explícita de crédito/reembolso. |
| Cobro en Argentina | Evaluar proveedores y requisitos fiscales antes de lanzar pagos; no diseñar el ledger atado a uno solo. |
| Abuso de prueba gratuita | Límites por identidad/organización, rate limiting, auditoría y revisión de anomalías. |
| Bajo volumen o falta de recompra | Medir cohortes, entrevistar clientes inactivos y ajustar empaques sólo con evidencia. |
| Dependencia de IA externa | Límites de gasto, reconciliación, proveedor encapsulado y degradación segura sin reintentos pagos inciertos. |
| Licencias de modelos locales | Inventario de licencias/procedencia y aprobación legal antes de producción. |
| Privacidad y retención de fotos | Storage privado, autorización, controles tenant/RLS, política de retención y borrado verificable. |

## L. Hipótesis pendientes de validación

| Sabemos por evidencia actual | Suponemos / debemos medir | Hemos probado | Aún pendiente |
|---|---|---|---|
| Hay arquitectura para jobs, storage privado, costos estimados y evaluación; el laboratorio aplica ocultamiento determinista sobre detecciones. | Disposición a pagar US$0,10 básica y US$0,50 avanzada; preferencia por créditos vs. suscripción; cantidad de fotos y frecuencia mensual. | El repositorio contiene experimentación local de detectores y una metodología de revisión, no evidencia de desempeño productivo. | Precisión en patentes argentinas/Mercosur, calidad de fondos propios, costo variable real, tasa de recompra y viabilidad de cinco pruebas gratis. |

Antes de lanzar, registrar para cada hipótesis: segmento, muestra, período, método, resultado, decisión y enlace a evidencia. No reemplazar mediciones por afirmaciones de venta, y no prometer mejoras de conversión o ventas sin evidencia propia verificable.
