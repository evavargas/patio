---
name: security-scope-check
description: Verificar que un cambio del back o del panel no abre datos de grupos ajenos a un moderador, no filtra credenciales ni el nivel, y cumple la matriz de permisos y las reglas de privacidad.
argument-hint: "<archivos o endpoints a revisar>"
---

# Chequeo de seguridad y alcance

Contexto: `docs/context/03-backend.md` (matriz), `11-seguridad-y-privacidad.md`.

## Alcance y permisos

1. Cada ruta de `/v1/panel` toca datos solo a través del servicio de alcance. Buscá consultas a colecciones que no reciban el filtro de grupos.
2. Matriz por ruta con cuatro actores: administrator, moderator dueño, moderator ajeno, player. Cada caso con su prueba. Un moderator ajeno recibe 403 `FORBIDDEN_SCOPE` o no ve el dato.
3. Eliminaciones solo del administrator. Nunca un moderator.
4. El guard del panel lee la cuenta en cada pedido (cuenta eliminada o inactiva no pasa).
5. Un moderator solo mueve jugadores entre sus grupos y respeta el máximo.

## Credenciales y datos

6. Tokens del jugador solo como SHA-256; códigos de recuperación solo como HMAC con secreto fuera de la base; contraseñas con argon2id; refresh tokens como hash.
7. El código en claro solo en la respuesta de registro y de reemisión.
8. El nivel no aparece en ninguna respuesta de `/v1`. Ninguna respuesta incluye hashes.
9. Logs sin apodos, tokens ni códigos.
10. Comparaciones de secretos en tiempo constante; aleatoriedad criptográfica.

## Bordes

11. Límites por IP en registro, código de grupo inexistente, recuperación y login.
12. Validación estricta con schema y tope de tamaño de cuerpo.
13. CORS con lista exacta y sin comodín.
14. Texto del jugador y de moderadores nunca como HTML.

Entrega: lista de hallazgos con archivo, gravedad y arreglo, más qué pruebas faltan. Si todo está bien, decí qué cubriste y qué no.
