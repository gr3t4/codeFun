# CodeFun v1.1 — Gestión Académica

Esta versión agrega la capa de gestión que faltaba.

## Flujo del alumno
1. Crea su cuenta con nombre, usuario y contraseña (sin correo).
2. Puede escribir el código de grupo de su docente.
3. Inicia sesión posteriormente con usuario y contraseña.
4. CodeFun conserva su sesión.
5. Cada ejercicio respondido se registra en Supabase.
6. Antes de practicar un tema de Python, ve una lección breve con ejemplo de código.
7. El alumno consulta materias, desempeño y grupo.

## Flujo del docente
1. El administrador convierte una cuenta a `teacher` desde el panel admin (o en Supabase).
2. El docente inicia sesión.
3. Crea grupos desde un formulario (nombre, ciclo, código generado o propio) y obtiene un código.
4. Comparte ese código con sus estudiantes.
5. Ve alumnos inscritos, avance, aciertos y seguimiento por materia.

## Flujo del administrador
1. Ve estadísticas globales: docentes, alumnos, grupos y precisión del sistema.
2. Ve todas las cuentas y puede cambiar el rol de cualquiera (alumno/docente/admin).
3. Ve todos los grupos de todos los docentes y puede eliminarlos.
4. La recuperación de contraseña no es autoservicio: el alumno/docente debe contactar
   al admin, quien puede definir una nueva contraseña desde el panel de Cuentas
   (botón "Contraseña" en cada fila). Esto usa la Edge Function
   `supabase/functions/admin-reset-password`, la única forma segura de hacerlo ya
   que las contraseñas solo pueden cambiarse con la clave `service_role`, que nunca
   se expone en el navegador. Para desplegarla:
   ```bash
   supabase functions deploy admin-reset-password --project-ref <tu-project-ref>
   ```

## Autenticación por usuario (no correo)
CodeFun no pide ni confirma correos. Internamente, cada `usuario` se guarda en
Supabase Auth como `usuario@codefun.local` (un dominio ficticio) para poder
usar el sistema de Auth de Supabase sin depender de un correo real. La
confirmación por correo está desactivada (`mailer_autoconfirm`), así que el
registro deja la sesión iniciada de inmediato.

## Probar sin Supabase
Deja `config.js` vacío. En el login:
- usuario `docente` = docente demo.
- cualquier otro usuario = alumno demo.
- utiliza cualquier contraseña de 6 caracteres.

## Activar gestión real
1. Crea un proyecto Supabase.
2. En SQL Editor ejecuta `supabase/schema.sql` completo (crea tablas, RLS y también
   las políticas/función del rol admin).
3. En Authentication, desactiva la confirmación por correo (`mailer_autoconfirm`)
   ya que se usan correos sintéticos internos.
4. Copia Project URL y anon/publishable key a `config.js`.
5. Para crear el primer administrador (no hay otra forma de crear el primero):

```sql
update public.profiles set role='admin' where username='tu.usuario';
```

Desde ahí, ese admin puede promover a cualquier otra cuenta desde el panel.

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

## v1.4 — Admin, autenticación por usuario, grupos y lecciones
- Nuevo rol `admin`: ve todas las cuentas/grupos/avance y puede cambiar roles.
- Se eliminó el correo: registro e inicio de sesión son con usuario y contraseña.
- Ya no depende de confirmación por correo (autoconfirm activado).
- Crear grupo (docente) ahora es un formulario, no una serie de `prompt()`.
- Programación Básica con Python: cada tema tiene una lección corta antes de
  sus ejercicios.
- Rediseño visual: paleta, iconos SVG propios y limpieza de CSS heredado.
- PWA completa: iconos PNG, `apple-touch-icon`, caché con versionado real.
