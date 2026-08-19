# CodeFun v1.1 — Gestión Académica

Esta versión agrega la capa de gestión que faltaba.

## Flujo del alumno
1. Crea su cuenta con nombre, número de control, correo y contraseña.
2. Puede escribir el código de grupo de su docente.
3. Inicia sesión posteriormente con correo y contraseña.
4. CodeFun conserva su sesión.
5. Cada ejercicio respondido se registra en Supabase.
6. El alumno consulta materias, desempeño y grupo.

## Flujo del docente
1. Se crea una cuenta normal.
2. El administrador la convierte una sola vez a `teacher` en Supabase.
3. El docente inicia sesión.
4. Crea grupos y obtiene un código.
5. Comparte ese código con sus estudiantes.
6. Ve alumnos inscritos, avance, aciertos y seguimiento por materia.

## Probar sin Supabase
Deja `config.js` vacío. En el login:
- `docente@demo.com` = docente demo.
- cualquier otro correo = alumno demo.
- utiliza cualquier contraseña de 6 caracteres.

## Activar gestión real
1. Crea un proyecto Supabase.
2. En SQL Editor ejecuta `supabase/schema.sql`.
3. En Authentication configura Email/Password.
4. Copia Project URL y anon/publishable key a `config.js`.
5. Para convertir una cuenta en docente ejecuta:

```sql
update public.profiles
set role='teacher'
where id=(select id from auth.users where email='docente@escuela.edu.mx');
```

## Ejecutar
```bash
python3 -m http.server 8080
```
Abre `http://127.0.0.1:8080`.

## Contenido
- Programación Básica con Python: 136 ejercicios.
- Lógica de Programación: 124 ejercicios.
- Total: 260 ejercicios.
- PWA.


## Cambio v1.1
- Pantalla de autenticación rediseñada a una sola columna.
- Se eliminó por completo el panel promocional izquierdo.
- Login y registro centrados.
- Recuperación de contraseña preparada para Supabase.

## v1.2 UI/UX responsive
- Sidebar optimizada para escritorio.
- Menú lateral deslizable en móvil.
- Barra inferior móvil.
- Controles táctiles más grandes.
- Pantalla de ejercicios más clara.
- Navegación adaptada a computadora, tablet y teléfono.
- Se conserva la gestión académica, Supabase y los 260 ejercicios.

## v1.3 — Retroalimentación pedagógica
- Cuando el alumno falla, CodeFun ya no muestra la respuesta correcta.
- En su lugar presenta una pista relacionada con el tema.
- La pista orienta el procedimiento sin resolver el ejercicio.
- Cuando acierta, únicamente confirma el resultado y permite continuar.
