// features/combos/lib/language_manager.js

// מנהל שפות - מזהה את השפה הנוכחית ומספק את השמות המדויקים של הכרטיסיות
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // הגדרת שפות נתמכות
  const LANGUAGES = {
    en: {
      code: "en",
      name: "English",
      garageText: "GARAGE",
      equipButtonText: "equip",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Turrets",
        Hulls: "Hulls",
        Grenades: "Grenades",
        Drones: "Drones",
        Protection: "Protection",
        Supplies: "Supplies",
        Paints: "Paints",
      },
      ui: {
        comboManager: "Combo Manager",
        specialExtension: "Special Extension",
        description:
          "Streamline your garage experience by instantly saving your current equipment loadout and equipping your favorite combos with a single click.",
        proTipLabel: "Pro Tip:",
        proTip1:
          "Consider saving your combos with Armadillo protection only, so when switching loadouts in battle you can quickly select your desired protections without having to manually remove unwanted ones that the combo automatically equipped.",
        proTip2Label: "Pro Tip 2:",
        proTip2:
          "Organize your combo list by dragging combo cards to place your most frequently used combos at the top for instant access.",
        autoOpenCheckbox: "Auto-open Combos tab",
        equipProtectionsCheckbox: "Include protections",
        saveCombo: "SAVE COMBO",
        equipCombo: "EQUIP",
        deleteCombo: "Delete combo",
        editCombo: "Edit combo",
        doneEditing: "Done editing",
        advisorHeadline: "Recommended protections",
        advisorEquipAll: "equip all",
        whatsNewTitle: "Fresh update just dropped!",
        whatsNewCombo: "Paint and skins now ride along with the combo",
        whatsNewRecommend: "Smart protection recommendations, based on the battle you're actually in",
        whatsNewPolish: "Runs lighter now, and yes - bugs were fixed",
        whatsNewGotIt: "Nice!",
        noSavedCombos: "No saved combos yet",
        clickToSave: 'Click "SAVE COMBO" to save your first combo!',
        deleteConfirm: "Are you sure you want to delete this combo?",
        deleteComboModalTitle: 'Delete combo "{comboName}"',
        cancel: "Cancel",
        delete: "Delete",
        surpriseMe: "SURPRISE ME",
        cooldownCaption: "CHANGES WILL BE APPLIED IN",
        hudEditorButton: "HUD editor",
        hudEditorSize: "Size",
        hudEditorOpacity: "Opacity",
        hudEditorUndo: "Undo",
        hudEditorReset: "Reset",
        hudEditorResetTitle: "Warning",
        hudEditorResetBody: "Changes in this section of the settings will be reset. Continue?",
        hudEditorBack: "Back",
        hudEditorTitle: "Tanki Combos & QoL - HUD Editor",
        hudEditorNoData: "The HUD layout could not be read from the game.",
        ok: "OK",
        randomizerSettings: "RANDOMIZER SETTINGS",
        randomizerMode: "Mode",
        randomizerModeFromSaved: "From saved combos",
        randomizerModeFullRandom: "Full random",
        randomizerCategories: "Categories",
        randomizerAugments: "Augments",
        randomizerTurrets: "Turrets",
        randomizerHulls: "Hulls",
        randomizerGrenades: "Grenades",
        randomizerDrones: "Drones",
        randomizerPaints: "Paints",
        randomizerSkins: "Skins",
        randomizerProtection: "Protection",
        randomizerTurretAugment: "Turret augment",
        randomizerHullAugment: "Hull augment",
        randomizerLegendaryOnly: "Legendary only",
        randomizerClose: "Close",
        randomizerMaxEquipmentOnly: "Max equipment only",
        randomizerAdvanced: "Advanced",
        randomizerExcludeBrutus: "Exclude Brutus",
        randomizerExcludeTsarGrenade: "Exclude Tsar grenade",
        randomCombo: "RANDOM COMBO",
        importCombos: "IMPORT COMBOS",
        exportCombos: "EXPORT COMBOS",
        importTitle: "Import Combos",
        importChooseAction:
          "Would you like to add these combos to your existing ones or replace all existing combos?",
        importAdd: "Add",
        importReplace: "Replace",
        importErrorTitle: "Import Error",
        importInvalidFile:
          "Please import a file in the same format as the exported file.",
        importWrongLanguage:
          "Combos can only be imported in the current game language.",
        combosTab: "COMBOS",
      },
    },
    ru: {
      code: "ru",
      name: "Russian",
      garageText: "ГАРАЖ",
      equipButtonText: "установить",
      itemNames: { brutus: "БРУТ", tsar: "ЦАРЬ" },
      tabs: {
        Turrets: "Пушки",
        Hulls: "Корпуса",
        Grenades: "Гранаты",
        Drones: "Дроны",
        Protection: "Защита",
        Supplies: "Припасы",
        Paints: "Краски",
      },
      ui: {
        comboManager: "Менеджер комбо",
        specialExtension: "Специальное расширение",
        description:
          "Упростите работу с гаражом, мгновенно сохраняя текущую комплектацию и применяя любимые комбо одним щелчком мыши.",
        proTipLabel: "Совет:",
        proTip1:
          "Рекомендуется сохранять комбо только с защитой Броненосец, чтобы в бою можно было быстро выбрать нужную защиту, не удаляя вручную ненужную, которую комбо автоматически установило.",
        proTip2Label: "Совет 2:",
        proTip2:
          "Организуйте список комбо, перетаскивая карточки комбо, чтобы разместить наиболее часто используемые комбо вверху для быстрого доступа.",
        autoOpenCheckbox: "Авто-открытие вкладки Комбо",
        equipProtectionsCheckbox: "Включать защиту",
        saveCombo: "СОХРАНИТЬ КОМБО",
        equipCombo: "УСТАНОВИТЬ",
        deleteCombo: "Удалить комбо",
        editCombo: "Редактировать комбо",
        doneEditing: "Готово",
        advisorHeadline: "Рекомендуемые защиты",
        advisorEquipAll: "надеть все",
        whatsNewTitle: "Свежее обновление уже тут!",
        whatsNewCombo: "Краска и скины теперь едут вместе с комбо",
        whatsNewRecommend: "Умные рекомендации защит — по тому бою, в котором вы сейчас",
        whatsNewPolish: "Работает легче, и да — баги починены",
        whatsNewGotIt: "Круто!",
        noSavedCombos: "Нет сохраненных комбо",
        clickToSave: 'Нажмите "СОХРАНИТЬ КОМБО" чтобы сохранить первое комбо!',
        deleteConfirm: "Вы уверены, что хотите удалить это комбо?",
        deleteComboModalTitle: 'Удалить комбо "{comboName}"',
        cancel: "Отмена",
        delete: "Удалить",
        surpriseMe: "УДИВИ МЕНЯ",
        cooldownCaption: "ИЗМЕНЕНИЯ ВСТУПЯТ В СИЛУ ЧЕРЕЗ",
        hudEditorButton: "Редактор интерфейса",
        hudEditorSize: "Размер",
        hudEditorOpacity: "Прозрачность",
        hudEditorUndo: "Отменить",
        hudEditorReset: "Сбросить",
        hudEditorResetTitle: "Внимание",
        hudEditorResetBody: "Изменения в этом разделе настроек будут сброшены. Продолжить?",
        hudEditorBack: "Назад",
        hudEditorTitle: "Tanki Combos & QoL - Редактор HUD",
        hudEditorNoData: "Не удалось прочитать раскладку HUD из игры.",
        ok: "ОК",
        randomizerSettings: "НАСТРОЙКИ РАНДОМАЙЗЕРА",
        randomizerMode: "Режим",
        randomizerModeFromSaved: "Из сохраненных комбо",
        randomizerModeFullRandom: "Полный рандом",
        randomizerCategories: "Категории",
        randomizerAugments: "Аугменты",
        randomizerTurrets: "Пушки",
        randomizerHulls: "Корпуса",
        randomizerGrenades: "Гранаты",
        randomizerDrones: "Дроны",
        randomizerPaints: "Краски",
        randomizerSkins: "Скины",
        randomizerProtection: "Защита",
        randomizerTurretAugment: "Аугмент пушки",
        randomizerHullAugment: "Аугмент корпуса",
        randomizerLegendaryOnly: "Только легендарные",
        randomizerClose: "Закрыть",
        randomizerMaxEquipmentOnly: "Только макс. уровень",
        randomizerAdvanced: "Дополнительно",
        randomizerExcludeBrutus: "Исключить Брутус",
        randomizerExcludeTsarGrenade: "Исключить Царь-гранату",
        randomCombo: "СЛУЧАЙНОЕ КОМБО",
        importCombos: "ИМПОРТ КОМБО",
        exportCombos: "ЭКСПОРТ КОМБО",
        importTitle: "Импорт комбо",
        importChooseAction:
          "Хотите добавить эти комбо к существующим или заменить все существующие комбо?",
        importAdd: "Добавить",
        importReplace: "Заменить",
        importErrorTitle: "Ошибка импорта",
        importInvalidFile:
          "Пожалуйста, импортируйте файл в том же формате, что и экспортированный файл.",
        importWrongLanguage:
          "Комбо можно импортировать только в текущем языке игры.",
        combosTab: "КОМБО",
      },
    },
    es: {
      code: "es",
      name: "Spanish",
      garageText: "GARAJE",
      equipButtonText: "equipar",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Torretas",
        Hulls: "Cascos",
        Grenades: "Granadas",
        Drones: "Dron",
        Protection: "Protección",
        Supplies: "Suministros",
        Paints: "Pintura",
      },
      ui: {
        comboManager: "Gestor de Combos",
        specialExtension: "Extensión Especial",
        description:
          "Optimiza tu experiencia en el garaje guardando instantáneamente tu configuración de equipo actual y equipando tus combos favoritos con un solo clic.",
        proTipLabel: "Consejo:",
        proTip1:
          "Considera guardar tus combos solo con protección Armadillo, para que al cambiar configuraciones en batalla puedas seleccionar rápidamente tus protecciones deseadas sin tener que eliminar manualmente las no deseadas que el combo equipó automáticamente.",
        proTip2Label: "Consejo 2:",
        proTip2:
          "Organiza tu lista de combos arrastrando las tarjetas de combo para colocar tus combos más utilizados en la parte superior para un acceso instantáneo.",
        autoOpenCheckbox: "Abrir Combos automáticamente",
        equipProtectionsCheckbox: "Incluir protecciones",
        saveCombo: "GUARDAR COMBO",
        equipCombo: "EQUIPAR",
        deleteCombo: "Eliminar combo",
        editCombo: "Editar combo",
        doneEditing: "Listo",
        advisorHeadline: "Protecciones recomendadas",
        advisorEquipAll: "equipar todo",
        whatsNewTitle: "¡Nueva actualización recién salida!",
        whatsNewCombo: "La pintura y los skins ahora viajan con el combo",
        whatsNewRecommend: "Recomendaciones de protecciones según la batalla en la que estás",
        whatsNewPolish: "Ahora va más ligero y sí, se arreglaron bugs",
        whatsNewGotIt: "¡Genial!",
        noSavedCombos: "No hay combos guardados aún",
        clickToSave:
          'Haz clic en "GUARDAR COMBO" para guardar tu primer combo!',
        deleteConfirm: "¿Estás seguro de que quieres eliminar este combo?",
        deleteComboModalTitle: 'Eliminar combo "{comboName}"',
        cancel: "Cancelar",
        delete: "Eliminar",
        surpriseMe: "SORPRÉNDEME",
        cooldownCaption: "LOS CAMBIOS SE APLICARÁN EN",
        hudEditorButton: "Editor de interfaz",
        hudEditorSize: "Tamaño",
        hudEditorOpacity: "Opacidad",
        hudEditorUndo: "Deshacer",
        hudEditorReset: "Restablecer",
        hudEditorResetTitle: "Advertencia",
        hudEditorResetBody: "Los cambios en esta sección de los ajustes se restablecerán. ¿Continuar?",
        hudEditorBack: "Atrás",
        hudEditorTitle: "Tanki Combos & QoL - Editor de HUD",
        hudEditorNoData: "No se pudo leer la disposición del HUD desde el juego.",
        ok: "OK",
        randomizerSettings: "AJUSTES DEL RANDOMIZADOR",
        randomizerMode: "Modo",
        randomizerModeFromSaved: "De combos guardados",
        randomizerModeFullRandom: "Aleatorio completo",
        randomizerCategories: "Categorías",
        randomizerAugments: "Mejoras",
        randomizerTurrets: "Torretas",
        randomizerHulls: "Cascos",
        randomizerGrenades: "Granadas",
        randomizerDrones: "Dron",
        randomizerPaints: "Pinturas",
        randomizerSkins: "Skins",
        randomizerProtection: "Protección",
        randomizerTurretAugment: "Mejora de torreta",
        randomizerHullAugment: "Mejora de casco",
        randomizerLegendaryOnly: "Solo legendarios",
        randomizerClose: "Cerrar",
        randomizerMaxEquipmentOnly: "Solo equipo máximo",
        randomizerAdvanced: "Avanzado",
        randomizerExcludeBrutus: "Excluir Brutus",
        randomizerExcludeTsarGrenade: "Excluir granada Tsar",
        randomCombo: "COMBO ALEATORIO",
        importCombos: "IMPORTAR COMBOS",
        exportCombos: "EXPORTAR COMBOS",
        importTitle: "Importar Combos",
        importChooseAction:
          "¿Deseas añadir estos combos a los existentes o reemplazar todos los combos existentes?",
        importAdd: "Añadir",
        importReplace: "Reemplazar",
        importErrorTitle: "Error de importación",
        importInvalidFile:
          "Por favor, importa un archivo en el mismo formato que el archivo exportado.",
        importWrongLanguage:
          "Solo se pueden importar combos en el idioma actual del juego.",
        combosTab: "COMBOS",
      },
    },
    pl: {
      code: "pl",
      name: "Polish",
      garageText: "HANGAR",
      equipButtonText: "wyposaż",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Wieże",
        Hulls: "Kadłuby",
        Grenades: "Granaty",
        Drones: "Drony",
        Protection: "Ochrona",
        Supplies: "Zaopatrzenie",
        Paints: "Farby",
      },
      ui: {
        comboManager: "Menedżer Combo",
        specialExtension: "Specjalne Rozszerzenie",
        description:
          "Usprawnij swoje doświadczenie w hangarze, błyskawicznie zapisując aktualny zestaw wyposażenia i wyposażając ulubione combo jednym kliknięciem.",
        proTipLabel: "Wskazówka:",
        proTip1:
          "Rozważ zapisywanie swoich combo tylko z ochroną Pancernik, aby podczas zmiany zestawów w bitwie móc szybko wybrać pożądane ochrony bez konieczności ręcznego usuwania niechcianych, które combo automatycznie założyło.",
        proTip2Label: "Wskazówka 2:",
        proTip2:
          "Uporządkuj swoją listę combo, przeciągając karty combo, aby umieścić najczęściej używane combo na górze dla natychmiastowego dostępu.",
        autoOpenCheckbox: "Auto-otwieranie zakładki Combo",
        equipProtectionsCheckbox: "Uwzględniaj ochrony",
        saveCombo: "ZAPISZ COMBO",
        equipCombo: "WYPOSAŻ",
        deleteCombo: "Usuń combo",
        editCombo: "Edytuj combo",
        doneEditing: "Gotowe",
        advisorHeadline: "Zalecane ochrony",
        advisorEquipAll: "załóż wszystko",
        whatsNewTitle: "Nowa aktualizacja właśnie wyszła!",
        whatsNewCombo: "Malowanie i skiny jadą teraz razem z combo",
        whatsNewRecommend: "Inteligentne rekomendacje ochron — na podstawie bitwy, w której jesteś",
        whatsNewPolish: "Działa luźniej, i tak — błędy naprawione",
        whatsNewGotIt: "Super!",
        noSavedCombos: "Brak zapisanych combo",
        clickToSave: 'Kliknij "ZAPISZ COMBO" aby zapisać pierwsze combo!',
        deleteConfirm: "Czy na pewno chcesz usunąć to combo?",
        deleteComboModalTitle: 'Usuń combo "{comboName}"',
        cancel: "Anuluj",
        delete: "Usuń",
        surpriseMe: "ZASKOCZ MNIE",
        cooldownCaption: "ZMIANY ZOSTANĄ ZASTOSOWANE ZA",
        hudEditorButton: "Edytor interfejsu",
        hudEditorSize: "Rozmiar",
        hudEditorOpacity: "Przezroczystość",
        hudEditorUndo: "Cofnij",
        hudEditorReset: "Resetuj",
        hudEditorResetTitle: "Uwaga",
        hudEditorResetBody: "Zmiany w tej sekcji ustawień zostaną zresetowane. Kontynuować?",
        hudEditorBack: "Wstecz",
        hudEditorTitle: "Tanki Combos & QoL - Edytor HUD",
        hudEditorNoData: "Nie udało się odczytać układu HUD z gry.",
        ok: "OK",
        randomizerSettings: "USTAWIENIA RANDOMIZERA",
        randomizerMode: "Tryb",
        randomizerModeFromSaved: "Z zapisanych combo",
        randomizerModeFullRandom: "Pełny losowy",
        randomizerCategories: "Kategorie",
        randomizerAugments: "Ulepszenia",
        randomizerTurrets: "Wieże",
        randomizerHulls: "Kadłuby",
        randomizerGrenades: "Granaty",
        randomizerDrones: "Drony",
        randomizerPaints: "Farby",
        randomizerSkins: "Skiny",
        randomizerProtection: "Ochrona",
        randomizerTurretAugment: "Ulepszenie wieży",
        randomizerHullAugment: "Ulepszenie kadłuba",
        randomizerLegendaryOnly: "Tylko legendarne",
        randomizerClose: "Zamknij",
        randomizerMaxEquipmentOnly: "Tylko maks. poziom",
        randomizerAdvanced: "Zaawansowane",
        randomizerExcludeBrutus: "Wyklucz Brutus",
        randomizerExcludeTsarGrenade: "Wyklucz granat Car",
        randomCombo: "LOSOWE COMBO",
        importCombos: "IMPORTUJ COMBO",
        exportCombos: "EKSPORTUJ COMBO",
        importTitle: "Importuj Combo",
        importChooseAction:
          "Czy chcesz dodać te combo do istniejących, czy zastąpić wszystkie istniejące combo?",
        importAdd: "Dodaj",
        importReplace: "Zastąp",
        importErrorTitle: "Błąd importu",
        importInvalidFile:
          "Proszę zaimportować plik w tym samym formacie co wyeksportowany plik.",
        importWrongLanguage:
          "Combo można importować tylko w bieżącym języku gry.",
        combosTab: "COMBO",
      },
    },
    pt: {
      code: "pt",
      name: "Portuguese",
      garageText: "GARAGEM",
      equipButtonText: "equipar",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Torretas",
        Hulls: "Carrocerias",
        Grenades: "Granadas",
        Drones: "Drone",
        Protection: "Proteção",
        Supplies: "Suprimentos",
        Paints: "Pintura",
      },
      ui: {
        comboManager: "Gerenciador de Combos",
        specialExtension: "Extensão Especial",
        description:
          "Simplifique sua experiência na garagem salvando instantaneamente sua configuração de equipamento atual e equipando seus combos favoritos com um único clique.",
        proTipLabel: "Dica:",
        proTip1:
          "Considere salvar seus combos apenas com proteção Armadillo, para que ao trocar configurações em batalha você possa selecionar rapidamente suas proteções desejadas sem precisar remover manualmente as indesejadas que o combo equipou automaticamente.",
        proTip2Label: "Dica 2:",
        proTip2:
          "Organize sua lista de combos arrastando os cartões de combo para colocar seus combos mais usados no topo para acesso instantâneo.",
        autoOpenCheckbox: "Abrir Combos automaticamente",
        equipProtectionsCheckbox: "Incluir proteções",
        saveCombo: "SALVAR COMBO",
        equipCombo: "EQUIPAR",
        deleteCombo: "Excluir combo",
        editCombo: "Editar combo",
        doneEditing: "Concluído",
        advisorHeadline: "Proteções recomendadas",
        advisorEquipAll: "equipar tudo",
        whatsNewTitle: "Atualização nova acabou de sair!",
        whatsNewCombo: "A pintura e as skins agora vão junto com o combo",
        whatsNewRecommend: "Recomendações de proteções com base na batalha em que você está",
        whatsNewPolish: "Roda mais leve agora e sim — bugs corrigidos",
        whatsNewGotIt: "Massa!",
        noSavedCombos: "Nenhum combo salvo ainda",
        clickToSave: 'Clique em "SALVAR COMBO" para salvar seu primeiro combo!',
        deleteConfirm: "Tem certeza de que deseja excluir este combo?",
        deleteComboModalTitle: 'Excluir combo "{comboName}"',
        cancel: "Cancelar",
        delete: "Excluir",
        surpriseMe: "SURPREENDA-ME",
        cooldownCaption: "AS ALTERAÇÕES SERÃO APLICADAS EM",
        hudEditorButton: "Editor de interface",
        hudEditorSize: "Tamanho",
        hudEditorOpacity: "Opacidade",
        hudEditorUndo: "Desfazer",
        hudEditorReset: "Redefinir",
        hudEditorResetTitle: "Aviso",
        hudEditorResetBody: "As alterações nesta seção das configurações serão redefinidas. Continuar?",
        hudEditorBack: "Voltar",
        hudEditorTitle: "Tanki Combos & QoL - Editor de HUD",
        hudEditorNoData: "Não foi possível ler o layout do HUD do jogo.",
        ok: "OK",
        randomizerSettings: "CONFIGURAÇÕES DO RANDOMIZADOR",
        randomizerMode: "Modo",
        randomizerModeFromSaved: "De combos salvos",
        randomizerModeFullRandom: "Aleatório completo",
        randomizerCategories: "Categorias",
        randomizerAugments: "Melhorias",
        randomizerTurrets: "Torretas",
        randomizerHulls: "Carrocerias",
        randomizerGrenades: "Granadas",
        randomizerDrones: "Drone",
        randomizerPaints: "Tintas",
        randomizerSkins: "Skins",
        randomizerProtection: "Proteção",
        randomizerTurretAugment: "Melhoria de torreta",
        randomizerHullAugment: "Melhoria de carroceria",
        randomizerLegendaryOnly: "Apenas lendários",
        randomizerClose: "Fechar",
        randomizerMaxEquipmentOnly: "Apenas equip. máximo",
        randomizerAdvanced: "Avançado",
        randomizerExcludeBrutus: "Excluir Brutus",
        randomizerExcludeTsarGrenade: "Excluir granada Tsar",
        randomCombo: "COMBO ALEATÓRIO",
        importCombos: "IMPORTAR COMBOS",
        exportCombos: "EXPORTAR COMBOS",
        importTitle: "Importar Combos",
        importChooseAction:
          "Deseja adicionar estes combos aos existentes ou substituir todos os combos existentes?",
        importAdd: "Adicionar",
        importReplace: "Substituir",
        importErrorTitle: "Erro de importação",
        importInvalidFile:
          "Por favor, importe um arquivo no mesmo formato do arquivo exportado.",
        importWrongLanguage:
          "Combos só podem ser importados no idioma atual do jogo.",
        combosTab: "COMBOS",
      },
    },
    de: {
      code: "de",
      name: "German",
      garageText: "GARAGE",
      equipButtonText: "ausstatten",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Waffen",
        Hulls: "Untersätze",
        Grenades: "Granaten",
        Drones: "Drohnen",
        Protection: "Schutz",
        Supplies: "Versorgungen",
        Paints: "Farben",
      },
      ui: {
        comboManager: "Combo-Manager",
        specialExtension: "Spezielle Erweiterung",
        description:
          "Optimieren Sie Ihr Garagenerlebnis, indem Sie Ihre aktuelle Ausrüstungskonfiguration sofort speichern und Ihre Lieblingscombos mit einem einzigen Klick ausrüsten.",
        proTipLabel: "Profi-Tipp:",
        proTip1:
          "Erwägen Sie, Ihre Combos nur mit Armadillo-Schutz zu speichern, damit Sie im Kampf beim Wechseln der Konfigurationen schnell Ihre gewünschten Schutzmodule auswählen können, ohne die unerwünschten manuell entfernen zu müssen, die das Combo automatisch ausgerüstet hat.",
        proTip2Label: "Profi-Tipp 2:",
        proTip2:
          "Organisieren Sie Ihre Combo-Liste, indem Sie Combo-Karten ziehen, um Ihre am häufigsten verwendeten Combos für sofortigen Zugriff oben zu platzieren.",
        autoOpenCheckbox: "Combos-Tab automatisch öffnen",
        equipProtectionsCheckbox: "Schutz einbeziehen",
        saveCombo: "COMBO SPEICHERN",
        equipCombo: "AUSSTATTEN",
        deleteCombo: "Combo löschen",
        editCombo: "Combo bearbeiten",
        doneEditing: "Fertig",
        advisorHeadline: "Empfohlene Schutzmodule",
        advisorEquipAll: "alle ausrüsten",
        whatsNewTitle: "Frisches Update ist da!",
        whatsNewCombo: "Lackierung und Skins fahren jetzt im Combo mit",
        whatsNewRecommend: "Clevere Schutz-Empfehlungen — passend zum Kampf, in dem du steckst",
        whatsNewPolish: "Läuft jetzt leichter, und ja — Bugs sind gefixt",
        whatsNewGotIt: "Nice!",
        noSavedCombos: "Noch keine Combos gespeichert",
        clickToSave:
          'Klicken Sie auf "COMBO SPEICHERN" um Ihr erstes Combo zu speichern!',
        deleteConfirm:
          "Sind Sie sicher, dass Sie dieses Combo löschen möchten?",
        deleteComboModalTitle: 'Combo "{comboName}" löschen',
        cancel: "Abbrechen",
        delete: "Löschen",
        surpriseMe: "ÜBERRASCH MICH",
        cooldownCaption: "ÄNDERUNGEN WERDEN ÜBERNOMMEN IN",
        hudEditorButton: "HUD-Editor",
        hudEditorSize: "Größe",
        hudEditorOpacity: "Deckkraft",
        hudEditorUndo: "Rückgängig",
        hudEditorReset: "Zurücksetzen",
        hudEditorResetTitle: "Achtung",
        hudEditorResetBody: "Änderungen in diesem Bereich der Einstellungen werden zurückgesetzt. Fortfahren?",
        hudEditorBack: "Zurück",
        hudEditorTitle: "Tanki Combos & QoL - HUD-Editor",
        hudEditorNoData: "Das HUD-Layout konnte nicht aus dem Spiel gelesen werden.",
        ok: "OK",
        randomizerSettings: "RANDOMIZER-EINSTELLUNGEN",
        randomizerMode: "Modus",
        randomizerModeFromSaved: "Aus gespeicherten Combos",
        randomizerModeFullRandom: "Voll zufällig",
        randomizerCategories: "Kategorien",
        randomizerAugments: "Verbesserungen",
        randomizerTurrets: "Waffen",
        randomizerHulls: "Untersätze",
        randomizerGrenades: "Granaten",
        randomizerDrones: "Drohnen",
        randomizerPaints: "Lackierungen",
        randomizerSkins: "Skins",
        randomizerProtection: "Schutz",
        randomizerTurretAugment: "Waffen-Verbesserung",
        randomizerHullAugment: "Untersatz-Verbesserung",
        randomizerLegendaryOnly: "Nur legendäre",
        randomizerClose: "Schließen",
        randomizerMaxEquipmentOnly: "Nur Max-Ausrüstung",
        randomizerAdvanced: "Erweitert",
        randomizerExcludeBrutus: "Brutus ausschließen",
        randomizerExcludeTsarGrenade: "Zar-Granate ausschließen",
        randomCombo: "ZUFÄLLIGES COMBO",
        importCombos: "COMBOS IMPORTIEREN",
        exportCombos: "COMBOS EXPORTIEREN",
        importTitle: "Combos importieren",
        importChooseAction:
          "Möchten Sie diese Combos zu den vorhandenen hinzufügen oder alle vorhandenen Combos ersetzen?",
        importAdd: "Hinzufügen",
        importReplace: "Ersetzen",
        importErrorTitle: "Importfehler",
        importInvalidFile:
          "Bitte importieren Sie eine Datei im gleichen Format wie die exportierte Datei.",
        importWrongLanguage:
          "Combos können nur in der aktuellen Spielsprache importiert werden.",
        combosTab: "COMBOS",
      },
    },
    fr: {
      code: "fr",
      name: "French",
      garageText: "GARAGE",
      equipButtonText: "équiper",
      itemNames: { brutus: "BRUTUS", tsar: "TSAR" },
      tabs: {
        Turrets: "Tourelles",
        Hulls: "Tanks",
        Grenades: "Grenades",
        Drones: "Drone",
        Protection: "Protection",
        Supplies: "Ravitaillements",
        Paints: "Peinture",
      },
      ui: {
        comboManager: "Gestionnaire de Combos",
        specialExtension: "Extension Spéciale",
        description:
          "Simplifiez votre expérience de garage en sauvegardant instantanément votre configuration d'équipement actuelle et en équipant vos combos préférés en un seul clic.",
        proTipLabel: "Conseil Pro:",
        proTip1:
          "Envisagez de sauvegarder vos combos uniquement avec la protection Armadillo, afin de pouvoir sélectionner rapidement vos protections souhaitées lors du changement de configurations en bataille sans avoir à supprimer manuellement celles indésirables que le combo a automatiquement équipées.",
        proTip2Label: "Conseil Pro 2:",
        proTip2:
          "Organisez votre liste de combos en faisant glisser les cartes de combo pour placer vos combos les plus utilisés en haut pour un accès instantané.",
        autoOpenCheckbox: "Ouvrir Combos automatiquement",
        equipProtectionsCheckbox: "Inclure les protections",
        saveCombo: "SAUVEGARDER COMBO",
        equipCombo: "ÉQUIPER",
        deleteCombo: "Supprimer combo",
        editCombo: "Modifier combo",
        doneEditing: "Terminé",
        advisorHeadline: "Protections recommandées",
        advisorEquipAll: "tout équiper",
        whatsNewTitle: "Nouvelle mise à jour fraîchement sortie !",
        whatsNewCombo: "La peinture et les skins voyagent maintenant avec le combo",
        whatsNewRecommend: "Recommandations de protections, basées sur la bataille où tu es",
        whatsNewPolish: "Ça tourne plus léger, et oui — des bugs corrigés",
        whatsNewGotIt: "Nickel !",
        noSavedCombos: "Aucun combo sauvegardé",
        clickToSave:
          'Cliquez sur "SAUVEGARDER COMBO" pour sauvegarder votre premier combo!',
        deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce combo?",
        deleteComboModalTitle: 'Supprimer combo "{comboName}"',
        cancel: "Annuler",
        delete: "Supprimer",
        surpriseMe: "SURPRENEZ-MOI",
        cooldownCaption: "LES MODIFICATIONS SERONT APPLIQUÉES DANS",
        hudEditorButton: "Éditeur d'interface",
        hudEditorSize: "Taille",
        hudEditorOpacity: "Opacité",
        hudEditorUndo: "Annuler",
        hudEditorReset: "Réinitialiser",
        hudEditorResetTitle: "Attention",
        hudEditorResetBody: "Les modifications de cette section des paramètres seront réinitialisées. Continuer ?",
        hudEditorBack: "Retour",
        hudEditorTitle: "Tanki Combos & QoL - Éditeur de HUD",
        hudEditorNoData: "Impossible de lire la disposition du HUD depuis le jeu.",
        ok: "OK",
        randomizerSettings: "PARAMÈTRES DU RANDOMISEUR",
        randomizerMode: "Mode",
        randomizerModeFromSaved: "Des combos sauvegardés",
        randomizerModeFullRandom: "Aléatoire complet",
        randomizerCategories: "Catégories",
        randomizerAugments: "Améliorations",
        randomizerTurrets: "Tourelles",
        randomizerHulls: "Tanks",
        randomizerGrenades: "Grenades",
        randomizerDrones: "Drone",
        randomizerPaints: "Peintures",
        randomizerSkins: "Skins",
        randomizerProtection: "Protection",
        randomizerTurretAugment: "Amélioration de tourelle",
        randomizerHullAugment: "Amélioration de tank",
        randomizerLegendaryOnly: "Légendaires uniquement",
        randomizerClose: "Fermer",
        randomizerMaxEquipmentOnly: "Équipement max uniquement",
        randomizerAdvanced: "Avancé",
        randomizerExcludeBrutus: "Exclure Brutus",
        randomizerExcludeTsarGrenade: "Exclure grenade Tsar",
        randomCombo: "COMBO ALÉATOIRE",
        importCombos: "IMPORTER COMBOS",
        exportCombos: "EXPORTER COMBOS",
        importTitle: "Importer des Combos",
        importChooseAction:
          "Souhaitez-vous ajouter ces combos aux existants ou remplacer tous les combos existants ?",
        importAdd: "Ajouter",
        importReplace: "Remplacer",
        importErrorTitle: "Erreur d'importation",
        importInvalidFile:
          "Veuillez importer un fichier au même format que le fichier exporté.",
        importWrongLanguage:
          "Les combos ne peuvent être importés que dans la langue actuelle du jeu.",
        combosTab: "COMBOS",
      },
    },
    ja: {
      code: "ja",
      name: "Japanese",
      garageText: "ガレージ",
      equipButtonText: "装備",
      itemNames: { brutus: "ブルータス", tsar: "ツァーリ" },
      tabs: {
        Turrets: "タレット",
        Hulls: "車体",
        Grenades: "グレネード",
        Drones: "ドローン",
        Protection: "保護",
        Supplies: "支援物資",
        Paints: "塗装",
      },
      ui: {
        comboManager: "コンボマネージャー",
        specialExtension: "特別拡張機能",
        description:
          "ガレージ体験を効率化し、現在の装備構成を即座に保存し、お気に入りのコンボをワンクリックで装備できます。",
        proTipLabel: "プロのヒント:",
        proTip1:
          "アルマジロ保護のみでコンボを保存することを検討してください。戦闘中に構成を切り替える際、コンボが自動的に装備した不要なものを手動で削除する必要なく、希望の保護を素早く選択できます。",
        proTip2Label: "プロのヒント2:",
        proTip2:
          "コンボカードをドラッグしてコンボリストを整理し、最もよく使用するコンボを上部に配置して即座にアクセスできるようにします。",
        autoOpenCheckbox: "コンボタブを自動で開く",
        equipProtectionsCheckbox: "保護を含める",
        saveCombo: "コンボを保存",
        equipCombo: "装備",
        deleteCombo: "コンボを削除",
        editCombo: "コンボを編集",
        doneEditing: "完了",
        advisorHeadline: "推奨プロテクション",
        advisorEquipAll: "すべて装備",
        whatsNewTitle: "新しいアップデートが届いた！",
        whatsNewCombo: "ペイントとスキンもコンボと一緒に保存",
        whatsNewRecommend: "今いる戦闘に合わせたプロテクションの推奨",
        whatsNewPolish: "動作が軽くなり、バグも修正済み",
        whatsNewGotIt: "いいね！",
        noSavedCombos: "保存されたコンボはまだありません",
        clickToSave:
          "「コンボを保存」をクリックして最初のコンボを保存してください！",
        deleteConfirm: "このコンボを削除してもよろしいですか？",
        deleteComboModalTitle: "コンボ「{comboName}」を削除",
        cancel: "キャンセル",
        delete: "削除",
        surpriseMe: "サプライズ",
        cooldownCaption: "変更が適用されるまで",
        hudEditorButton: "HUDエディター",
        hudEditorSize: "サイズ",
        hudEditorOpacity: "不透明度",
        hudEditorUndo: "元に戻す",
        hudEditorReset: "リセット",
        hudEditorResetTitle: "警告",
        hudEditorResetBody: "この設定セクションの変更はリセットされます。続行しますか？",
        hudEditorBack: "戻る",
        hudEditorTitle: "Tanki Combos & QoL - HUDエディター",
        hudEditorNoData: "ゲームからHUDの配置を読み取れませんでした。",
        ok: "OK",
        randomizerSettings: "ランダマイザー設定",
        randomizerMode: "モード",
        randomizerModeFromSaved: "保存済みコンボから",
        randomizerModeFullRandom: "完全ランダム",
        randomizerCategories: "カテゴリ",
        randomizerAugments: "強化",
        randomizerTurrets: "砲塔",
        randomizerHulls: "車体",
        randomizerGrenades: "グレネード",
        randomizerDrones: "ドローン",
        randomizerPaints: "ペイント",
        randomizerSkins: "スキン",
        randomizerProtection: "保護",
        randomizerTurretAugment: "砲塔強化",
        randomizerHullAugment: "車体強化",
        randomizerLegendaryOnly: "レジェンダリーのみ",
        randomizerClose: "閉じる",
        randomizerMaxEquipmentOnly: "最大装備のみ",
        randomizerAdvanced: "詳細設定",
        randomizerExcludeBrutus: "ブルータスを除外",
        randomizerExcludeTsarGrenade: "ツァーグレネードを除外",
        randomCombo: "ランダムコンボ",
        importCombos: "インポート",
        exportCombos: "エクスポート",
        importTitle: "コンボをインポート",
        importChooseAction:
          "これらのコンボを既存のものに追加しますか、それとも既存のコンボをすべて置き換えますか？",
        importAdd: "追加",
        importReplace: "置換",
        importErrorTitle: "インポートエラー",
        importInvalidFile:
          "エクスポートされたファイルと同じ形式のファイルをインポートしてください。",
        importWrongLanguage:
          "コンボは現在のゲーム言語でのみインポートできます。",
        combosTab: "コンボ",
      },
    },
    tr: {
      code: "tr",
      name: "Turkish",
      garageText: "GARAJ",
      equipButtonText: "kuşan",
      itemNames: { brutus: "BRÜTÜS", tsar: "TSAR" },
      tabs: {
        Turrets: "Taretler",
        Hulls: "Gövdeler",
        Grenades: "El Bombaları",
        Drones: "Dronelar",
        Protection: "Koruma",
        Supplies: "Malzemeler",
        Paints: "Boyalar",
      },
      ui: {
        comboManager: "Kombo Yöneticisi",
        specialExtension: "Özel Eklenti",
        description:
          "Mevcut teçhizat düzeninizi anında kaydederek ve favori kombolarınızı tek bir tıklamayla kuşanarak garaj deneyiminizi kolaylaştırın.",
        proTipLabel: "İpucu:",
        proTip1:
          "Kombolarınızı yalnızca Armadillo korumasıyla kaydetmeyi düşünün, böylece savaşta düzen değiştirirken kombonun otomatik olarak kuşandığı istenmeyen korumaları elle kaldırmak zorunda kalmadan istediğiniz korumaları hızlıca seçebilirsiniz.",
        proTip2Label: "İpucu 2:",
        proTip2:
          "Kombo kartlarını sürükleyerek en sık kullandığınız komboları hızlı erişim için üste yerleştirin.",
        autoOpenCheckbox: "Kombolar sekmesini otomatik aç",
        equipProtectionsCheckbox: "Korumaları dahil et",
        saveCombo: "KOMBO KAYDET",
        equipCombo: "KUŞAN",
        deleteCombo: "Komboyu sil",
        editCombo: "Komboyu düzenle",
        doneEditing: "Bitti",
        advisorHeadline: "Önerilen korumalar",
        advisorEquipAll: "tümünü kuşan",
        whatsNewTitle: "Yeni güncelleme şimdi düştü!",
        whatsNewCombo: "Boya ve kaplamalar artık kombo ile birlikte geliyor",
        whatsNewRecommend: "Akıllı koruma önerileri — içinde olduğun savaşa göre",
        whatsNewPolish: "Artık daha hafif çalışıyor, ve evet — hatalar düzeltildi",
        whatsNewGotIt: "Harika!",
        noSavedCombos: "Henüz kaydedilmiş kombo yok",
        clickToSave:
          'İlk kombonuzu kaydetmek için "KOMBO KAYDET"e tıklayın!',
        deleteConfirm: "Bu komboyu silmek istediğinizden emin misiniz?",
        deleteComboModalTitle: '"{comboName}" kombosunu sil',
        cancel: "İptal",
        delete: "Sil",
        surpriseMe: "ŞAŞIRT BENİ",
        cooldownCaption: "DEĞİŞİKLİKLER ŞU SÜRE İÇİNDE UYGULANACAK",
        hudEditorButton: "Arayüz düzenleyici",
        hudEditorSize: "Boyut",
        hudEditorOpacity: "Saydamlık",
        hudEditorUndo: "Geri al",
        hudEditorReset: "Sıfırla",
        hudEditorResetTitle: "Uyarı",
        hudEditorResetBody: "Ayarların bu bölümündeki değişiklikler sıfırlanacak. Devam edilsin mi?",
        hudEditorBack: "Geri",
        hudEditorTitle: "Tanki Combos & QoL - HUD Düzenleyici",
        hudEditorNoData: "HUD düzeni oyundan okunamadı.",
        ok: "TAMAM",
        randomizerSettings: "RASTGELELEŞTİRİCİ AYARLARI",
        randomizerMode: "Mod",
        randomizerModeFromSaved: "Kayıtlı kombolardan",
        randomizerModeFullRandom: "Tam rastgele",
        randomizerCategories: "Kategoriler",
        randomizerAugments: "Güçlendirmeler",
        randomizerTurrets: "Taretler",
        randomizerHulls: "Gövdeler",
        randomizerGrenades: "El Bombaları",
        randomizerDrones: "Dronelar",
        randomizerPaints: "Boyalar",
        randomizerSkins: "Kaplamalar",
        randomizerProtection: "Koruma",
        randomizerTurretAugment: "Taret güçlendirmesi",
        randomizerHullAugment: "Gövde güçlendirmesi",
        randomizerLegendaryOnly: "Sadece efsanevi",
        randomizerClose: "Kapat",
        randomizerMaxEquipmentOnly: "Sadece maks. seviye",
        randomizerAdvanced: "Gelişmiş",
        randomizerExcludeBrutus: "Brutus hariç tut",
        randomizerExcludeTsarGrenade: "Çar bombası hariç tut",
        randomCombo: "RASTGELE KOMBO",
        importCombos: "KOMBOLARI İÇE AKTAR",
        exportCombos: "KOMBOLARI DIŞA AKTAR",
        importTitle: "Komboları İçe Aktar",
        importChooseAction:
          "Bu komboları mevcut olanlara eklemek mi yoksa tüm mevcut komboları değiştirmek mi istiyorsunuz?",
        importAdd: "Ekle",
        importReplace: "Değiştir",
        importErrorTitle: "İçe Aktarma Hatası",
        importInvalidFile:
          "Lütfen dışa aktarılan dosyayla aynı formatta bir dosya içe aktarın.",
        importWrongLanguage:
          "Kombolar yalnızca mevcut oyun dilinde içe aktarılabilir.",
        combosTab: "KOMBOLAR",
      },
    },
    cs: {
      code: "cs",
      name: "Czech",
      garageText: "GARÁŽ",
      equipButtonText: "vybavit",
      itemNames: { brutus: "BRUTUS", tsar: "CAR" },
      tabs: {
        Turrets: "Věže",
        Hulls: "Podvozky",
        Grenades: "Granáty",
        Drones: "Drony",
        Protection: "Ochrana",
        Supplies: "Dodatky",
        Paints: "Laky",
      },
      ui: {
        comboManager: "Správce Combo",
        specialExtension: "Speciální Rozšíření",
        description:
          "Zjednodušte si práci v garáži okamžitým uložením aktuální výbavy a nasazením oblíbených combo jedním kliknutím.",
        proTipLabel: "Tip:",
        proTip1:
          "Zvažte ukládání combo pouze s ochranou Armadillo, abyste při změně sestav v bitvě mohli rychle vybrat požadované ochrany bez nutnosti ručně odstraňovat nežádoucí, které combo automaticky nasadilo.",
        proTip2Label: "Tip 2:",
        proTip2:
          "Uspořádejte svůj seznam combo přetažením karet combo a umístěte nejpoužívanější combo nahoru pro okamžitý přístup.",
        autoOpenCheckbox: "Automaticky otevřít záložku Combo",
        equipProtectionsCheckbox: "Zahrnout ochrany",
        saveCombo: "ULOŽIT COMBO",
        equipCombo: "VYBAVIT",
        deleteCombo: "Smazat combo",
        editCombo: "Upravit combo",
        doneEditing: "Hotovo",
        advisorHeadline: "Doporučené ochrany",
        advisorEquipAll: "nasadit vše",
        whatsNewTitle: "Čerstvá aktualizace je tady!",
        whatsNewCombo: "Barva a skiny teď jedou spolu s combem",
        whatsNewRecommend: "Chytré doporučení ochran — podle bitvy, ve které právě jsi",
        whatsNewPolish: "Běží to lehčeji a ano — chyby jsou opravené",
        whatsNewGotIt: "Super!",
        noSavedCombos: "Zatím žádné uložené combo",
        clickToSave:
          'Klikněte na "ULOŽIT COMBO" pro uložení prvního combo!',
        deleteConfirm: "Opravdu chcete smazat toto combo?",
        deleteComboModalTitle: 'Smazat combo "{comboName}"',
        cancel: "Zrušit",
        delete: "Smazat",
        surpriseMe: "PŘEKVAP MĚ",
        cooldownCaption: "ZMĚNY BUDOU POUŽITY ZA",
        hudEditorButton: "Editor rozhraní",
        hudEditorSize: "Velikost",
        hudEditorOpacity: "Průhlednost",
        hudEditorUndo: "Zpět",
        hudEditorReset: "Obnovit",
        hudEditorResetTitle: "Upozornění",
        hudEditorResetBody: "Změny v této části nastavení budou obnoveny. Pokračovat?",
        hudEditorBack: "Zpět",
        hudEditorTitle: "Tanki Combos & QoL - Editor HUD",
        hudEditorNoData: "Rozložení HUD se nepodařilo načíst ze hry.",
        ok: "OK",
        randomizerSettings: "NASTAVENÍ RANDOMIZÉRU",
        randomizerMode: "Režim",
        randomizerModeFromSaved: "Z uložených combo",
        randomizerModeFullRandom: "Plně náhodný",
        randomizerCategories: "Kategorie",
        randomizerAugments: "Vylepšení",
        randomizerTurrets: "Věže",
        randomizerHulls: "Podvozky",
        randomizerGrenades: "Granáty",
        randomizerDrones: "Drony",
        randomizerPaints: "Barvy",
        randomizerSkins: "Skiny",
        randomizerProtection: "Ochrana",
        randomizerTurretAugment: "Vylepšení věže",
        randomizerHullAugment: "Vylepšení podvozku",
        randomizerLegendaryOnly: "Pouze legendární",
        randomizerClose: "Zavřít",
        randomizerMaxEquipmentOnly: "Pouze max. úroveň",
        randomizerAdvanced: "Pokročilé",
        randomizerExcludeBrutus: "Vyloučit Brutus",
        randomizerExcludeTsarGrenade: "Vyloučit granát Car",
        randomCombo: "NÁHODNÉ COMBO",
        importCombos: "IMPORTOVAT COMBO",
        exportCombos: "EXPORTOVAT COMBO",
        importTitle: "Importovat Combo",
        importChooseAction:
          "Chcete tato combo přidat k existujícím nebo nahradit všechna existující combo?",
        importAdd: "Přidat",
        importReplace: "Nahradit",
        importErrorTitle: "Chyba importu",
        importInvalidFile:
          "Prosím importujte soubor ve stejném formátu jako exportovaný soubor.",
        importWrongLanguage:
          "Combo lze importovat pouze v aktuálním jazyce hry.",
        combosTab: "COMBO",
      },
    },
    hi: {
      code: "hi",
      name: "Hindi",
      garageText: "गैरेज",
      equipButtonText: "लैस",
      itemNames: { brutus: "ब्रूटस", tsar: "ज़ार" },
      tabs: {
        Turrets: "तोप",
        Hulls: "ढाँचा",
        Grenades: "ग्रेनेड्स",
        Drones: "ड्रोन्स",
        Protection: "सुरक्षा",
        Supplies: "सप्लाईज़",
        Paints: "पेंट्स",
      },
      ui: {
        comboManager: "कॉम्बो मैनेजर",
        specialExtension: "विशेष एक्सटेंशन",
        description:
          "अपने मौजूदा उपकरण सेटअप को तुरंत सहेजकर और अपने पसंदीदा कॉम्बो को एक क्लिक से लैस करके अपने गैरेज अनुभव को सरल बनाएं।",
        proTipLabel: "सुझाव:",
        proTip1:
          "अपने कॉम्बो को केवल आर्मडिलो सुरक्षा के साथ सहेजने पर विचार करें, ताकि युद्ध में लोडआउट बदलते समय आप बिना अनचाही सुरक्षा को मैन्युअल रूप से हटाए अपनी इच्छित सुरक्षा जल्दी से चुन सकें।",
        proTip2Label: "सुझाव 2:",
        proTip2:
          "कॉम्बो कार्ड को खींचकर अपनी कॉम्बो सूची व्यवस्थित करें और सबसे अधिक उपयोग किए जाने वाले कॉम्बो को त्वरित पहुंच के लिए शीर्ष पर रखें।",
        autoOpenCheckbox: "कॉम्बो टैब स्वतः खोलें",
        equipProtectionsCheckbox: "सुरक्षा शामिल करें",
        saveCombo: "कॉम्बो सहेजें",
        equipCombo: "लैस करें",
        deleteCombo: "कॉम्बो हटाएं",
        editCombo: "कॉम्बो संपादित करें",
        doneEditing: "हो गया",
        advisorHeadline: "अनुशंसित सुरक्षा",
        advisorEquipAll: "सभी लगाएँ",
        whatsNewTitle: "नया अपडेट अब्बी आया है!",
        whatsNewCombo: "अब पेंट और स्किन बही कॉम्भो के साथ जाते हैं",
        whatsNewRecommend: "स्मार्ट सुरक्षा सिफारिशें — उसी युद्ध के हिसाब से जिसमें आप हैं",
        whatsNewPolish: "अब हल्का चलता है, और हाँ — बग ठीक हुё",
        whatsNewGotIt: "शानदार!",
        noSavedCombos: "अभी तक कोई सहेजा गया कॉम्बो नहीं",
        clickToSave:
          'अपना पहला कॉम्बो सहेजने के लिए "कॉम्बो सहेजें" पर क्लिक करें!',
        deleteConfirm: "क्या आप वाकई इस कॉम्बो को हटाना चाहते हैं?",
        deleteComboModalTitle: 'कॉम्बो "{comboName}" हटाएं',
        cancel: "रद्द करें",
        delete: "हटाएं",
        surpriseMe: "चौंकाओ मुझे",
        cooldownCaption: "परिवर्तन लागू होंगे",
        hudEditorButton: "HUD एडिटर",
        hudEditorSize: "आकार",
        hudEditorOpacity: "अपारदर्शिता",
        hudEditorUndo: "पूर्ववत करें",
        hudEditorReset: "रीसेट करें",
        hudEditorResetTitle: "चेतावनी",
        hudEditorResetBody: "सेटिंग्स के इस भाग में किए गए बदलाव रीसेट हो जाएंगे। जारी रखें?",
        hudEditorBack: "वापस",
        hudEditorTitle: "Tanki Combos & QoL - HUD एडिटर",
        hudEditorNoData: "गेम से HUD लेआउट नहीं पढ़ा जा सका।",
        ok: "ठीक है",
        randomizerSettings: "रैंडमाइज़र सेटिंग्स",
        randomizerMode: "मोड",
        randomizerModeFromSaved: "सहेजे गए कॉम्बो से",
        randomizerModeFullRandom: "पूर्ण रैंडम",
        randomizerCategories: "श्रेणियाँ",
        randomizerAugments: "संवर्द्धन",
        randomizerTurrets: "तोप",
        randomizerHulls: "ढाँचा",
        randomizerGrenades: "ग्रेनेड्स",
        randomizerDrones: "ड्रोन्स",
        randomizerPaints: "पेंट्स",
        randomizerSkins: "स्किन्स",
        randomizerProtection: "सुरक्षा",
        randomizerTurretAugment: "तोप संवर्द्धन",
        randomizerHullAugment: "ढाँचा संवर्द्धन",
        randomizerLegendaryOnly: "केवल लीजेंडरी",
        randomizerClose: "बंद करें",
        randomizerMaxEquipmentOnly: "केवल अधिकतम उपकरण",
        randomizerAdvanced: "उन्नत",
        randomizerExcludeBrutus: "ब्रूटस को बाहर रखें",
        randomizerExcludeTsarGrenade: "ज़ार ग्रेनेड को बाहर रखें",
        randomCombo: "रैंडम कॉम्बो",
        importCombos: "कॉम्बो आयात करें",
        exportCombos: "कॉम्बो निर्यात करें",
        importTitle: "कॉम्बो आयात करें",
        importChooseAction:
          "क्या आप इन कॉम्बो को मौजूदा में जोड़ना चाहते हैं या सभी मौजूदा कॉम्बो को बदलना चाहते हैं?",
        importAdd: "जोड़ें",
        importReplace: "बदलें",
        importErrorTitle: "आयात त्रुटि",
        importInvalidFile:
          "कृपया निर्यात की गई फ़ाइल के समान प्रारूप में फ़ाइल आयात करें।",
        importWrongLanguage:
          "कॉम्बो केवल वर्तमान गेम भाषा में ही आयात किए जा सकते हैं।",
        combosTab: "कॉम्बो",
      },
    },
    // ניתן להוסיף עוד שפות כאן בקלות
  };

  window.TankiQoL.LanguageManager = {
    currentLanguage: null,
    detectedLanguageCode: null,

    // זיהוי השפה הנוכחית לפי הטקסט ב-BreadcrumbsComponentStyle-rootTitle span + 3 הכרטיסיות הראשונות
    detectLanguage() {
      const DOM = window.TankiQoL.DOM;

      // חיפוש הטקסט ב-BreadcrumbsComponentStyle-rootTitle span
      const rootTitle = document.querySelector(DOM.GARAGE_ROOT_TITLE);

      if (!rootTitle) {
        this.currentLanguage = LANGUAGES.en;
        this.detectedLanguageCode = "en";
        return this.currentLanguage;
      }

      const garageText = rootTitle.textContent?.trim() || "";
      const garageTextUpper = garageText.toUpperCase();

      // איסוף 3 הכרטיסיות הראשונות מהדף (Turrets, Hulls, Grenades)
      const menuContainer = document.querySelector(DOM.MENU_CONTAINER);
      let pageTabs = [];

      if (menuContainer) {
        const tabs = menuContainer.querySelectorAll(`.${DOM.TAB_ITEM_CLASS}`);
        // סינון טאב הקומבואים לפי data attribute (לא לפי טקסט, כי הטקסט מתורגם)
        const tabTexts = Array.from(tabs)
          .filter((tab) => !tab.dataset.cmeComboTab)
          .map((tab) => tab.textContent?.trim() || "")
          .filter((text) => text)
          .slice(0, 3); // רק 3 הראשונות

        pageTabs = tabTexts.map((text) => text.toUpperCase());
      }

      // ניסיון לזהות שפה לפי הטקסט של GARAGE + הכרטיסיות
      let bestMatch = null;
      let bestMatchScore = 0;

      for (const [langCode, langData] of Object.entries(LANGUAGES)) {
        const langGarageText = langData.garageText.toUpperCase();
        let score = 0;

        // בדיקת garageText (1 נקודה)
        if (garageTextUpper === langGarageText) {
          score += 1;
        }

        // בדיקת 3 הכרטיסיות הראשונות (3 נקודות - אחת לכל כרטיסייה)
        if (pageTabs.length > 0) {
          const langTabs = [
            langData.tabs.Turrets.toUpperCase(),
            langData.tabs.Hulls.toUpperCase(),
            langData.tabs.Grenades.toUpperCase(),
          ];

          for (let i = 0; i < Math.min(pageTabs.length, langTabs.length); i++) {
            if (pageTabs[i] === langTabs[i]) {
              score += 1;
            }
          }
        }

        // אם יש התאמה מלאה (garageText + כל 3 הכרטיסיות) - זו השפה הנכונה
        if (score === 4) {
          this.currentLanguage = langData;
          this.detectedLanguageCode = langCode;
          return this.currentLanguage;
        }

        // שמירת ההתאמה הטובה ביותר
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = { langData, langCode };
        }
      }

      // אם יש התאמה טובה (לפחות garageText או 2 כרטיסיות), נשתמש בה
      if (bestMatch && bestMatchScore >= 2) {
        this.currentLanguage = bestMatch.langData;
        this.detectedLanguageCode = bestMatch.langCode;
        return this.currentLanguage;
      }

      // אם לא זיהינו שפה, נשתמש באנגלית כברירת מחדל
      this.currentLanguage = LANGUAGES.en;
      this.detectedLanguageCode = "en";
      return this.currentLanguage;
    },

    // קבלת השפה הנוכחית (עם זיהוי אוטומטי אם עדיין לא זוהה)
    getCurrentLanguage() {
      if (!this.currentLanguage) {
        this.detectLanguage();
      }
      return this.currentLanguage;
    },

    // קבלת קוד השפה הנוכחית
    getCurrentLanguageCode() {
      if (!this.detectedLanguageCode) {
        this.detectLanguage();
      }
      return this.detectedLanguageCode;
    },

    // קבלת שם כרטיסייה לפי מפתח (Turrets, Hulls, וכו')
    getTabName(key) {
      const lang = this.getCurrentLanguage();
      return lang.tabs[key] || key;
    },

    // קבלת כל שמות הכרטיסיות
    getAllTabNames() {
      const lang = this.getCurrentLanguage();
      return lang.tabs;
    },

    // קבלת הטקסט של כפתור ה-equip בשפה הנוכחית
    getEquipButtonText() {
      const lang = this.getCurrentLanguage();
      return lang.equipButtonText || "equip";
    },

    // קבלת טקסט UI לפי מפתח
    getUIText(key) {
      const lang = this.getCurrentLanguage();
      // נפילה לאנגלית לפני המפתח עצמו, שלא ידלוף שם משתנה למסך
      return lang.ui?.[key] || LANGUAGES.en.ui?.[key] || key;
    },

    // בדיקה אם שפה נתמכת
    isLanguageSupported(langCode) {
      return LANGUAGES.hasOwnProperty(langCode);
    },

    // קבלת נתוני שפה לפי קוד
    getLanguageByCode(langCode) {
      return LANGUAGES[langCode] || LANGUAGES.en;
    },

    // איפוס (לצורך זיהוי מחדש)
    reset() {
      this.currentLanguage = null;
      this.detectedLanguageCode = null;
    },
  };
})();
