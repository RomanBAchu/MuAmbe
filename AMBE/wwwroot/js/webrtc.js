let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];

// Улучшенный конфиг для пробития блокировок провайдеров без VPN
const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            // Принудительный TCP на 443 порту — самый надежный способ обхода NAT
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10 // Подготавливает пути заранее, чтобы не было дисконнекта
};

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

window.startLocalVideo = async (id) => {
    console.log("Включаю камеру...");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoElem = document.getElementById(id);
        if (videoElem) videoElem.srcObject = localStream;
    } catch (err) {
        console.error("Ошибка при доступе к камере:", err);
    }
};

function createPC() {
    console.log("Создаю PeerConnection (защищенный режим)...");
    peerConnection = new RTCPeerConnection(config);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            console.log("Отправляю ICE-кандидата...");
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ПОЛУЧЕН ВИДЕОПОТОК ОТ ПАРТНЕРА!");
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo && e.streams[0]) {
            remoteVideo.srcObject = e.streams[0];
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("Статус соединения:", peerConnection.iceConnectionState);
        // Если соединение упало, пытаемся восстановить (опционально)
        if (peerConnection.iceConnectionState === 'failed') {
            console.warn("Соединение не удалось. Проверьте сеть.");
        }
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    if (!peerConnection) createPC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Обработка накопившихся кандидатов
    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        await peerConnection.addIceCandidate(cand).catch(e => console.warn("Ошибка кандидата:", e));
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
    }
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate).catch(e => console.warn("Ошибка кандидата:", e));
    }
};
