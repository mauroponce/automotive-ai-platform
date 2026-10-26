# Estrategia comercial del SaaS automotriz

Actualizado el 25 de octubre de 2026. Contexto permanente para alcance, arquitectura, experiencia, precios y prioridades. Las decisiones explícitas de este sprint reemplazan la estrategia anterior. Este documento separa hechos verificables, objetivos e hipótesis; no es una promesa de capacidades comerciales validadas.

## Decisiones definitivas

Exactamente dos modalidades:

- **Gratis:** difuminado de una o varias regiones visibles dentro de **una fotografía**, completamente en el navegador. React, TypeScript, ONNX Runtime Web, modelo especializado y Canvas. Sin registro, backend de procesamiento, almacenamiento remoto ni créditos. La detección propone rectángulos corregibles; no detectar no garantiza que no haya patente.
- **Pago:** edición avanzada generativa mediante OpenAI en el backend. Next.js/Node.js, PostgreSQL/Prisma, S3 privado de Hetzner, pg-boss y Docker. OpenAI realiza fondos, iluminación, integración y sombras. Conservar originales y exigir revisión humana.

Quedan descartados como producto y arquitectura activa: edición básica paga, showroom local, laboratorios locales, modelos Python en servidor, segmentación local, sombras procedurales y composición determinística como alternativa comercial. Sharp queda limitado a operaciones auxiliares de validación, orientación y formatos. No reintroducir esos motores sin una nueva decisión explícita.

## Estado respaldado por el repositorio

| Área | Evidencia | Límite comercial |
| --- | --- | --- |
| Herramienta gratuita | Editor compartido, ONNX servido por la aplicación, regiones editables, zoom/pan y Canvas. | Los pesos existentes siguen sin aprobación de redistribución comercial; ver `browser-detector-license.md`. No hay garantía de anonimización ni de detección completa. |
| Identidad y concesionarias | Google OAuth, pertenencia y roles verificados en servidor, prueba exacta de 14 días y RLS. | La prueba permite acceso al portal; no autoriza consumo ilimitado de OpenAI. Google requiere credenciales por entorno. |
| Piloto avanzado | Lotes persistentes de 1–15 fotos, showroom precargado o propio, prompts por imagen, cuota manual, cola, S3 y revisión. | Las pruebas usan proveedor simulado. Calidad real, habilitación de la cuenta y costo facturado requieren un piloto pago explícitamente autorizado. |
| Costos | Tarifas versionadas y estimaciones por uso reportado. | Estimación no equivale a factura; uso faltante requiere conciliación. Reservas inciertas requieren intervención. |
| Super Admin | Control de acceso y navegación comercial conservados. | Las secciones sin backend se identifican como pendientes; no constituyen módulos entregados. |
| Créditos/pagos | Próxima prioridad definida. | No hay billetera, compras verificadas, reembolsos ni Mercado Pago implementados. |

## Clientes y propuesta

SaaS B2B inicialmente para concesionarias argentinas pequeñas y medianas, de autos y motos. Objetivo: convertir fotografías comunes en presentaciones profesionales, preservando identidad, condición y daños visibles del vehículo. La fidelidad generativa es una exigencia a revisar, no una garantía técnica.

La herramienta gratuita facilita la primera experiencia. El flujo pago objetivo es iniciar sesión con Google, elegir concesionaria, subir 1–15 fotos, elegir showroom, configurar las opciones disponibles, confirmar el costo autorizado, procesar, revisar y descargar. No exponer detalles de laboratorio al cliente ni anunciar opciones que el backend no soporte.

## Monetización: próxima prioridad, sin implementar ahora

Créditos prepagos, sin suscripción obligatoria. Saldo por organización, compras verificadas, historial auditable, consumo por imagen final y reembolsos. Definir reservas, fallas, regeneraciones, vencimiento y devoluciones antes de cobrar. Hasta entonces se mantienen cupos piloto manuales limitados.

**Hipótesis de precio: US$0,50 por imagen avanzada final**, sujeto a validar costos completos y disposición a pagar. No es un precio aprobado. El difuminado en navegador es gratuito. No implementar Mercado Pago ni billetera en este sprint.

## Objetivos e hipótesis a validar

- Conseguir 10 concesionarias que paguen y repitan uso; es una meta, no un resultado alcanzado.
- Medir calidad/fidelidad con fotos autorizadas de autos y motos, condiciones reales y showrooms propios.
- Medir costo total por imagen entregada: OpenAI, fallas, reintentos, almacenamiento, tráfico, comisiones futuras, impuestos, soporte e infraestructura.
- Evaluar la meta de costo variable de hasta US$0,20 para el precio tentativo de US$0,50; no declarar ese margen logrado.
- Validar adquisición directa y conversión de la herramienta gratuita al piloto, sin spam ni promesas de mejora de ventas sin evidencia.
- Investigar competidores y tarifas vigentes antes de fijar precios; las comparaciones históricas no constituyen evidencia actual de mercado.

## Prioridades y riesgos

Primero estabilidad, aislamiento entre organizaciones, licencia del detector, reconciliación económica y calidad real con autorización. Después créditos verificados y pagos. Integraciones, API comercial y expansión quedan para etapas posteriores.

Riesgos principales: derechos de los pesos, patentes omitidas, alteración del vehículo, fallas parciales, consumo incierto del proveedor y precio insuficiente. Mitigaciones: bloqueo de aprobación comercial del modelo, corrección manual, originales inmutables, revisión humana, reservas limitadas, idempotencia, costos versionados y observabilidad. Ningún resultado simulado valida calidad de OpenAI ni rentabilidad.
