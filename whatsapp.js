const { Client, AuthStrategy, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Cria uma nova instância do cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});


const listaPecas = require('./itens.json');
const modelos = listaPecas.modelos;


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

client.on('message', async message => {
    const usuario = message.from;


    // Usuário está escolhendo a peça
    if (estadoUsuario[usuario] === 'aguardandoPeca') {
        const pedido = message.body.trim();
        if (listaPecas.itens.map(p => p.toLowerCase()).includes(pedido.toLowerCase())) {
            await client.sendMessage(usuario, `Você pediu: "${pedido}". Estou verificando no estoque...`);
            await client.sendMessage(usuario, `Temos o item "${pedido}" em estoque!`);
            await client.sendMessage(usuario, 'Digite o modelo do carro:');
            estadoUsuario[usuario] = 'aguardandoModelo';
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
            await client.sendMessage(usuario, `O modelo "${modeloEncontrado}" está disponível!`);
            await client.sendMessage(usuario, 'Digite o ano do carro ou aguarde para ser atendido.');
            estadoUsuario[usuario] = null;
        } else {
            await client.sendMessage(usuario, `Desculpe, não temos o modelo "${modeloPedido}" disponível.`);
            await client.sendMessage(usuario, 'Digite novamente a marca do carro:');
        }
        return;
    }

    await message.reply('Olá! Como posso ajudar?');
    await client.sendMessage(usuario, 'Para acessar nossa loja, digite o que você precisa. Ex: Cabeçote, Parachoque, Motor, ou qualquer outro tipo de peça:');
    estadoUsuario[usuario] = 'aguardandoPeca';
});

client.initialize();
