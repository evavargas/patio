# Seguridad y privacidad

Los jugadores son niños de 6 a 10 años: la privacidad es un requisito de producto, no una mejora.

## Datos

Se guarda: ID aleatorio y fecha de registro, apodo (moderado), grupo actual e historial, hash del token, HMAC del código de recuperación, aceptación de términos (versión y fecha), acceso al set del día, logros, puntaje, conteos y nivel, y cuentas del panel (correo, rol, hash de contraseña; son adultos).

NO se recolecta: nombre real, email o fecha de nacimiento de niños, ubicación, identificadores publicitarios, analítica de terceros, texto libre salvo el apodo, intentos, errores ni abandonos.

## Reglas duras para el código

1. Ningún SDK, plugin o librería con seguimiento. Toda dependencia nueva se revisa por telemetría y licencia.
2. Fuentes autoalojadas. Ningún pedido a CDN de terceros desde las apps.
3. Los logs NO contienen apodos, tokens ni códigos. Solo ID de pedido, ruta, estado, duración y `playerId` o `accountId`.
4. Solo se guarda el hash de tokens y el HMAC de códigos. El código en claro existe solo en la respuesta del registro y de la reemisión.
5. Todo texto que ve el jugador se renderiza como texto plano. Nunca `dangerouslySetInnerHTML` ni Markdown/HTML interpretado.
6. Ninguna ruta del panel devuelve datos de grupos ajenos a un moderador. Todo pasa por el servicio de alcance.
7. Validación estricta con schema en cada borde. Tope bajo de tamaño de cuerpo.
8. Secretos solo en variables de entorno o secretos del repo.
9. El panel usa CSP estricta, sin scripts en línea.
10. El cliente nunca recibe el nivel ni datos de otros jugadores.

## Superficies de ataque conocidas y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Adivinar código de grupo y aparecer en un grupo ajeno | Límite de intentos por IP, regenerar o desactivar el código, sacar al jugador |
| Fuerza bruta del código de recuperación | HMAC con secreto fuera de la base, límite por IP, alfabeto de 31 símbolos de 8 caracteres |
| Inundación de registros (muchas IP) | Alerta de crecimiento anómalo en el Resumen; capa delante si hiciera falta (requiere dominio) |
| Robo de tokens del panel | Acceso de 15 min, refresh rotativo con detección de reutilización, CSP, sin HTML de usuarios |
| Cliente que miente sobre el logro | Aceptado en el MVP: solo afecta el progreso del propio jugador. El servidor valida formato, pertenencia al set e idempotencia |
| Filtración de la base | Sin datos personales de niños; hashes y HMAC; HMAC con secreto fuera de la base |
| Moderador accede a datos ajenos | Servicio de alcance con pruebas dedicadas, matriz de permisos probada por ruta |
| Acceso abierto a cualquier IP en Atlas (respaldo) | Credenciales largas, cuenta de solo lectura distinta de la de la API |

## Cumplimiento (pendiente de revisión jurídica, no resuelto aquí)

No hay consentimiento parental (decisión de producto). La revisión jurídica y el modelo de negocio se tratan aparte. No afirmar en código ni en documentos que Patio cumple una normativa concreta. Los textos de términos y privacidad están por redactar.
