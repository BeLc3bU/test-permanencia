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

echo "--- Iniciando la creación de issues desde $YAML_FILE ---"

# 1. Crear Milestones para cada Sprint
echo "Creando Milestones para los sprints..."
yq '.sprints[] | .name' $YAML_FILE | while read -r sprint_name; do
    echo "Creando Milestone: '$sprint_name'"
    gh milestone create "$sprint_name" --description "Issues para el sprint: $sprint_name" || echo "Milestone '$sprint_name' ya existe."
done

# 2. Iterar sobre sprints, épicas e historias de usuario para crear los issues
sprint_count=$(yq '.sprints | length' $YAML_FILE)

for ((s=0; s<$sprint_count; s++)); do
    sprint_name=$(yq ".sprints[$s].name" $YAML_FILE)
    echo -e "\n--- Procesando Sprint: $sprint_name ---"

    epic_count=$(yq ".sprints[$s].epics | length" $YAML_FILE)
    for ((e=0; e<$epic_count; e++)); do
        epic_title=$(yq ".sprints[$s].epics[$e].epic" $YAML_FILE)
        epic_description=$(yq ".sprints[$s].epics[$e].description" $YAML_FILE)
        
        echo "Creando issue para la Épica: '$epic_title'"
        # Crear el issue para la épica y capturar su número
        epic_issue_url=$(gh issue create --title "EPIC: $epic_title" --body "$epic_description" --label "epic" --milestone "$sprint_name")
        epic_issue_number=$(echo "$epic_issue_url" | awk -F'/' '{print $NF}')
        echo "Épica creada con el número: #$epic_issue_number"

        story_count=$(yq ".sprints[$s].epics[$e].user_stories | length" $YAML_FILE)
        for ((us=0; us<$story_count; us++)); do
            story_title=$(yq ".sprints[$s].epics[$e].user_stories[$us].story" $YAML_FILE)
            tasks=$(yq ".sprints[$s].epics[$e].user_stories[$us].tasks[]" $YAML_FILE | sed 's/^/- [ ] /')
            story_body="**Parte de la Épica #$epic_issue_number**\n\n### Tareas a realizar:\n$tasks"

            echo "  Creando issue para la Historia de Usuario: '$story_title'"
            gh issue create --title "$story_title" --body "$story_body" --label "user-story" --milestone "$sprint_name"
        done
    done
done

echo -e "\n--- Proceso completado. Revisa los issues en tu repositorio de GitHub. ---"