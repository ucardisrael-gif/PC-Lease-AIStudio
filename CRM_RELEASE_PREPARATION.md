# Подготовка локальных изменений CRM к публикации

Обновлено 02.11.2026. Это перечень для подготовки выпуска, не готовый пакет развёртывания. Ничего не опубликовано.

## Проверенные CRM-файлы

- Сервер и маршруты: server/crm-work.mjs, server/crm-work-router.mjs, server/crm-work-access.mjs.
- Интерфейс: src/components/backoffice/CrmWorkBoard.tsx, CrmArchiveAll.tsx, CrmBoardVisibility.tsx, CrmCardHistoryTab.tsx, CrmUsersAdmin.tsx.
- Тесты: server/tests/crm-work-schema.test.mjs, crm-work-browser.test.mjs, crm-work-access.test.mjs, crm-work-app-browser.test.mjs.
- Новые файлы схемы CRM: server/migrations/093_crm_workforce.sql, 098_crm_board_visibility.sql, 099_crm_board_actions.sql, 100_crm_granular_card_permissions.sql, 101_crm_structure_permissions.sql. Миграции нельзя применять к внешней базе без отдельной проверки совместимости и резервной копии.

## Что необходимо отделить до выпуска

CRM зависит от общих изменённых файлов server/access-roles.mjs, admin-users.mjs, auth.mjs, database.mjs, index.mjs и компонентов AccessRoles.tsx, OwnerBackOffice.tsx и UserManagement.tsx. Эти файлы содержат и другие изменения: нельзя включать их целиком без разбора. Нужен отдельный чистый набор изменений с проверкой зависимостей и миграций в копии целевой среды; находящиеся рядом документы, изображения и другие разделы сайта в этот набор не включать. Проверка полного соответствия SwiftCRM, физической печати и нагрузки не завершена.

## Выполненные проверки

Локальная изолированная база: сортировка по полю, числовой порядок, отказ скрытому полю и полю другой доски; браузер: выбор поля, работа архива, досок и карточек; полная оболочка CRM и сборка; TypeScript. Локальный API обновлён, health 200. Данные SwiftCRM и внешняя среда не менялись.
