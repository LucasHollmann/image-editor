# Pixel Studio — contexto do projeto

## Objetivo
Aplicativo desktop para edição simples de imagens e criação de pixel art, construído com Electron, React e TypeScript.

## Estado atual
- A interface está em português do Brasil e usa um tema escuro. O editor ocupa toda a área de trabalho; não há painel de criação à direita.
- A criação de canvas tem categorias "Padrão" (1920×1080 inicial, presets HD/Full HD/quadrado/retrato) e "Pixel art" (32×32 inicial, presets para ícones e sprites).
- O renderer oferece configuração de nome, dimensões em pixels (1–4096), presets, cor de fundo e grade.
- Criar canvas inicializa a tela HTML Canvas após sua montagem; o pincel permite desenhar com a cor selecionada na barra de ferramentas.
- A configuração inicial de fundo tem amostras e seletor de cor. A grade é visual, não altera os pixels.
- Apenas um canvas fica aberto por vez. O app inicia com o diálogo de criação de canvas aberto; o mesmo diálogo abre pelo comando Novo canvas. As configurações de criação ficam nesse diálogo e não permanecem como painel lateral após criar.
- O menu Arquivo nativo do Electron e o menu da interface permitem criar um canvas novo (pede confirmação antes de descartar o atual; Ctrl+N) e exportar o canvas como PNG pelo diálogo nativo de salvar (Ctrl+S).
- O menu nativo Exibir oferece Ferramentas do desenvolvedor (Ctrl+Shift+I).
- O zoom pode ser controlado pelos botões ou com Ctrl+roda do mouse. A escala máxima é calculada a partir de `canvasArea.clientHeight` (a div `.canvas-area.has-canvas`) e do tamanho renderizado do pixel (`canvas.getBoundingClientRect().height / alturaEmPixels`), permitindo aproximar o limite de dez pixels visíveis na vertical. A mesma div tem altura limitada pela janela, contém scroll vertical/horizontal visível e se desloca no sentido oposto ao movimento do mouse enquanto Espaço está pressionado (sem precisar clicar). Abrir/importar arquivos, histórico e paleta de cores estão fora deste escopo.
- O projeto usa Vite no renderer e Electron no processo principal. O Electron está configurado com `contextIsolation` habilitado e `nodeIntegration` desabilitado.

## Comandos
- `npm install`: instalar dependências.
- `npm run dev`: abrir o app em modo de desenvolvimento.
- `npm run typecheck`: validar os projetos TypeScript.
- `npm run build`: compilar e gerar instalador Windows NSIS em `release/`.

## Direção de produto
Priorizar uma experiência simples de edição de imagens, com pixel art como categoria de criação. Próximos passos naturais: importar imagens, desfazer/refazer e persistir projetos em arquivos locais.
