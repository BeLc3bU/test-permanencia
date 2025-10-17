#!/bin/bash

# Script para crear issues en GitHub a partir de un archivo project_issues.yml
#
# Prerrequisitos:
# 1. Tener instalado GitHub CLI: https://cli.github.com/
# 2. Haber iniciado sesión: `gh auth login`
# 3. Tener instalado yq: https://github.com/mikefarah/yq
# 4. Haber creado las etiquetas "epic" y "user-story" en el repositorio de GitHub.

set -e # Salir inmediatamente si un comando falla

YAML_FILE="project_issues.yml"

# Obtener el propietario y el nombre del repositorio automáticamente
echo "--- Obteniendo información del repositorio ---"
REPO_INFO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
if [ -z "$REPO_INFO" ]; then
    echo "Error: No se pudo obtener la información del repositorio. Asegúrate de estar en el directorio correcto y de haber iniciado sesión con 'gh auth login'."
    exit 1
fi
echo "Repositorio detectado: $REPO_INFO"

echo "--- Iniciando la creación de issues desde $YAML_FILE ---"

# 1. Crear Milestones para cada Sprint
echo "Creando Milestones para los sprints..."
yq '.sprints[] | .name' $YAML_FILE | while read -r sprint_name; do
    echo "Creando Milestone: '$sprint_name'"
    # Usamos `gh api` para crear el milestone, como solicitaste.
    # Esto es menos ideal que `gh milestone create` pero funciona como workaround.
    # El comando fallará si el milestone ya existe, y el `|| true` evita que el script se detenga.
    gh api "repos/$REPO_INFO/milestones" -X POST -F "title=$sprint_name" -F "description=Issues para el sprint: $sprint_name" >/dev/null 2>&1 || true
done

# 2. Iterar sobre sprints, épicas e historias de usuario para crear los issues
# Usamos yq para exportar los datos a JSON y procesarlos de forma más robusta y eficiente.
echo -e "\n--- Procesando Sprints, Épicas e Historias de Usuario ---"
yq -o=json '.sprints' $YAML_FILE | jq -c '.[]' | while IFS= read -r sprint_json; do
    sprint_name=$(echo "$sprint_json" | jq -r '.name')
    echo -e "\n--- Procesando Sprint: $sprint_name ---"

    echo "$sprint_json" | jq -c '.epics[]' | while IFS= read -r epic_json; do
        epic_title=$(echo "$epic_json" | jq -r '.epic')
        epic_description=$(echo "$epic_json" | jq -r '.description')

        echo "Creando issue para la Épica: '$epic_title'"
        # Crear el issue para la épica y capturar su número
        epic_issue_url=$(gh issue create --title "EPIC: $epic_title" --body "$epic_description" --label "epic" --milestone "$sprint_name")
        epic_issue_number=$(echo "$epic_issue_url" | awk -F'/' '{print $NF}')
        echo "Épica creada con el número: #$epic_issue_number"

        echo "$epic_json" | jq -c '.user_stories[]' | while IFS= read -r story_json; do
            story_title=$(echo "$story_json" | jq -r '.story')
            # Convertir el array de tareas de JSON a una lista de checkboxes en Markdown
            tasks_markdown=$(echo "$story_json" | jq -r '.tasks[] | "- [ ] \(.)"' )
            story_body=$(printf "**Parte de la Épica #%s**\n\n### Tareas a realizar:\n%s" "$epic_issue_number" "$tasks_markdown")

            echo "  Creando issue para la Historia de Usuario: '$story_title'"
            gh issue create --title "$story_title" --body "$story_body" --label "user-story" --milestone "$sprint_name"
        done
    done
done

echo -e "\n--- Proceso completado. Revisa los issues en tu repositorio de GitHub. ---"