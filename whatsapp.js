const { Client, AuthStrategy, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Cria uma nova instância do cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});


const listaPecas = require('./itens.json');
const modelos = listaPecas.modelos;
const anos = listaPecas.anos;


client.on('qr', (qr)=> {
    // Gera e exibe o QR code no terminal para ser escaneado pelo WhatsApp do celular
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR code acima com o seu telefone.');
});

client.on('ready', () => {
    console.log('Bot ligado');
});
let aguardandoResposta = {};
let estadoUsuario = {};
let dadosUsuario = {}; // Adicione esta linha para armazenar dados do usuário

client.on('message', async message => {
    const usuario = message.from;

    // Usuário está escolhendo a peça
    if (estadoUsuario[usuario] === 'aguardandoPeca') {
        const pedido = message.body.trim();
        if (listaPecas.itens.map(p => p.toLowerCase()).includes(pedido.toLowerCase())) {
            await client.sendMessage(usuario, `Você pediu: "${pedido}". Estou verificando no estoque...`);
            await client.sendMessage(usuario, `Temos o item "${pedido}" em estoque!`);
            await client.sendMessage(usuario, 'Digite a marca do carro:');
            estadoUsuario[usuario] = 'aguardandoModelo';
            dadosUsuario[usuario] = { peca: pedido }; // Armazena a peça
        } else {
            await client.sendMessage(usuario, `Desculpe, não temos "${pedido}" disponível em nosso estoque.`);
            await client.sendMessage(usuario, 'Para acessar nossa loja, digite o que você precisa. Ex: Cabeçote, Parachoque, Motor, ou qualquer outro tipo de peça:');
        }
        return;
    }

    if (estadoUsuario[usuario] === 'aguardandoModelo') {
        const modeloPedido = message.body.trim();
        const modeloEncontrado = Object.keys(modelos).find(modelo => modelo.toLowerCase() === modeloPedido.toLowerCase());
        if (modeloEncontrado) {
            await client.sendMessage(usuario, `Temos peças para a marca "${modeloEncontrado}" disponível!`);
            await client.sendMessage(usuario, 'Digite o modelo e ano do carro:');
            estadoUsuario[usuario] = 'aguardandoAno';
            dadosUsuario[usuario].modelo = modeloEncontrado; // Armazena o modelo
        } else {
            await client.sendMessage(usuario, `Desculpe, não temos o modelo "${modeloPedido}" disponível.`);
            await client.sendMessage(usuario, 'Digite novamente a marca do carro:');
        }
        return;
    }

    if (estadoUsuario[usuario] === 'aguardandoAno') {
        const anoPedido = message.body.trim();
        if (!isNaN(anoPedido) && (anoPedido.length === 4 || anoPedido.length === 2)) {
            let anoFinal = anoPedido;
            if (anoPedido.length === 2) {
                const anoInt = parseInt(anoPedido, 10);
                if (anoInt >= 0 && anoInt <= 30) {
                    anoFinal = '20' + anoPedido.padStart(2, '0');
                } else if (anoInt >= 31 && anoInt <= 99) {
                    anoFinal = '19' + anoPedido;
                }
            }
            
            const anoFinalInt = parseInt(anoFinal, 10);
            await client.sendMessage(usuario, `Você pediu peças para o ano ${anoFinal}.`);
            await client.sendMessage(usuario, 'Aguarde um momento enquanto verifico no estoque...');
            
            const modeloDoUsuario = dadosUsuario[usuario].modelo;
            
            // Verifica se o ano está disponível na array do modelo escolhido
            if (anos[modeloDoUsuario] && anos[modeloDoUsuario].includes(anoFinalInt)) {
                await client.sendMessage(usuario, `Temos "${dadosUsuario[usuario].peca}" disponível para ${modeloDoUsuario} ano ${anoFinal}!`);
                await client.sendMessage(usuario, `Deseja fazer um pedido? Se sim, digite 1 e aguarde para ser atendido. Caso queira voltar a pesquisar, digite qualquer palavra.`);
                estadoUsuario[usuario] = 'aguardandoPedido'; // Mudança aqui
            } else {
                await client.sendMessage(usuario, `Desculpe, não temos peças disponíveis para ${modeloDoUsuario} ano ${anoFinal}.`);
                await client.sendMessage(usuario, 'Deseja tentar outro ano? Digite novamente o ano do carro:');
                // Mantém no estado 'aguardandoAno' para tentar novamente
            }
        } else {
            await client.sendMessage(usuario, 'Por favor, digite um ano válido (2 ou 4 dígitos).');
        }
        return;
    }

    // Novo bloco para lidar com a resposta do pedido
    if (estadoUsuario[usuario] === 'aguardandoPedido') {
        const resposta = message.body.trim();
        if (resposta === '1') {
            await client.sendMessage(usuario, 'Perfeito! já vamos atendê-lo. (Esse sistema será automatizado em breve! você conseguirá comprar qualquer peça sem precisar interagir com um atendente.)');
            // Reset do estado para começar uma nova conversa
            delete estadoUsuario[usuario];
            delete dadosUsuario[usuario];
        } else {
            await client.sendMessage(usuario, 'Para acessar nossa loja, digite o que você precisa. Ex: Cabeçote, Parachoque, Motor, ou qualquer outro tipo de peça:');
            estadoUsuario[usuario] = 'aguardandoPeca';
        }
        return;
    }

    await message.reply(`Olá! Como podemos ajudar?`);
    await client.sendMessage(usuario, 'Para acessar nossa loja, digite o que você precisa. Ex: Cabeçote, Parachoque, Motor, ou qualquer outro tipo de peça:');
    estadoUsuario[usuario] = 'aguardandoPeca';
});

client.initialize();
