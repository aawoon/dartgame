// ===== TTS (Text-to-Speech) Functions =====
function speak(text, lang = 'ko-KR') {
    // 브라우저가 TTS를 지원하는지 확인
    if (!('speechSynthesis' in window)) {
        console.warn('이 브라우저는 TTS를 지원하지 않습니다.');
        return;
    }
    
    // 이전 음성 중지
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;  // 속도 (0.1 ~ 10)
    utterance.pitch = 1.0; // 피치 (0 ~ 2)
    utterance.volume = 1.0; // 볼륨 (0 ~ 1)
    
    // 한국어 음성 찾기
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice => voice.lang.includes('ko'));
    if (koreanVoice) {
        utterance.voice = koreanVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// 음성 목록이 로드된 후 사용할 수 있도록 초기화
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// Toast Notification Functions
function showToast(message, type = 'info', title = '', duration = 3000) {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        success: '성공',
        error: '오류',
        warning: '주의',
        info: '알림'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// Shorthand toast functions
function toastSuccess(message, title = '') {
    return showToast(message, 'success', title);
}

function toastError(message, title = '') {
    return showToast(message, 'error', title);
}

function toastWarning(message, title = '') {
    return showToast(message, 'warning', title);
}

function toastInfo(message, title = '') {
    return showToast(message, 'info', title);
}

// Custom Dialog Functions
function showDialog(message, type = 'confirm', icon = '⚠️') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('customDialog');
        const messageEl = document.getElementById('dialogMessage');
        const iconEl = document.getElementById('dialogIcon');
        const confirmBtn = document.getElementById('dialogConfirmBtn');
        const cancelBtn = document.getElementById('dialogCancelBtn');
        
        messageEl.textContent = message;
        iconEl.textContent = icon;
        
        // Alert only mode (single button)
        if (type === 'alert') {
            dialog.classList.add('alert-only');
        } else {
            dialog.classList.remove('alert-only');
        }
        
        dialog.classList.add('show');
        
        const handleConfirm = () => {
            dialog.classList.remove('show');
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            dialog.classList.remove('show');
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function showAlert(message, icon = 'ℹ️') {
    return showDialog(message, 'alert', icon);
}

function showConfirm(message, icon = '⚠️') {
    return showDialog(message, 'confirm', icon);
}

// Game State
let gameState = {
    type: 'countup',
    mode: 'individual',
    players: [],
    teams: [],
    currentPlayerIndex: 0,
    // 팀전용 인덱스
    currentTeamIndex: 0,
    teamPlayerIndices: [], // 각 팀의 현재 선수 인덱스
    currentDarts: [],
    currentDartDetails: [], // 크리켓용 상세 정보
    turnScore: 0,
    round: 1,
    maxTurns: 5, // 최대 턴수
    scores: {},
    teamScores: {}, // 팀 점수 (301/501 팀전용)
    roundScores: {}, // 라운드별 점수: { playerId: [라운드1점수, 라운드2점수, ...] }
    cricketScores: {}, // 크리켓용: { playerId: { 20: 0, 19: 0, ... } }
    inputMode: 'dartboard' // 'dartboard' 또는 'grid'
};

// 현재 플레이어/팀의 점수 가져오기 (301/501 팀전은 팀 점수 반환)
function getCurrentScore(player) {
    if (gameState.mode === 'team' && (gameState.type === '501' || gameState.type === '301')) {
        const teamName = player.team || gameState.teams[gameState.currentTeamIndex].name;
        return gameState.teamScores[teamName];
    }
    return gameState.scores[player.id];
}

// 현재 플레이어/팀의 점수 설정 (301/501 팀전은 팀 점수 설정)
function setCurrentScore(player, score) {
    if (gameState.mode === 'team' && (gameState.type === '501' || gameState.type === '301')) {
        const teamName = player.team || gameState.teams[gameState.currentTeamIndex].name;
        gameState.teamScores[teamName] = score;
    } else {
        gameState.scores[player.id] = score;
    }
}

// 게임별 턴수 옵션
const turnLimitOptions = {
    '501': { options: [10, 13, 17, 20], default: 13 },
    '301': { options: [6, 8, 10], default: 8 },
    'countup': { options: [3, 5, 8, 10], default: 5 }
};

// Dartboard segments
const segments = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Cricket numbers (15-20 + Bull)
const cricketNumbers = [20, 19, 18, 17, 16, 15, 25]; // 25 = Bull

// Game type display names
const gameTypeNames = {
    '501': '501',
    '301': '301',
    'cricket': '크리켓',
    'countup': '카운트업 (8R)',
    'around': '어라운드 더 클락'
};

// Count-up game settings
// COUNTUP_ROUNDS는 이제 gameState.maxTurns 사용

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeSetup();
    createDartboard();
});

// 팀 설정 상태
let teamConfig = {
    teamCount: 2,
    playersPerTeam: 2
};

function initializeSetup() {
    // Game type selection
    document.querySelectorAll('#gameTypeGroup .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gameTypeGroup .option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.type = btn.dataset.type;
            updateTurnLimitOptions();
        });
    });
    
    // 초기 턴수 옵션 설정
    updateTurnLimitOptions();

    // Game mode selection
    document.querySelectorAll('#gameModeGroup .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gameModeGroup .option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.mode = btn.dataset.mode;
            
            document.getElementById('individualSetup').style.display = gameState.mode === 'individual' ? 'block' : 'none';
            document.getElementById('teamSetup').style.display = gameState.mode === 'team' ? 'block' : 'none';
            
            // 팀전 선택 시 팀 생성
            if (gameState.mode === 'team') {
                generateTeamInputs();
            }
        });
    });
    
    // 팀 개수 선택
    document.querySelectorAll('#teamCountGroup .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#teamCountGroup .option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            teamConfig.teamCount = parseInt(btn.dataset.count);
            generateTeamInputs();
        });
    });
    
    // 팀당 선수 선택
    document.querySelectorAll('#playersPerTeamGroup .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#playersPerTeamGroup .option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            teamConfig.playersPerTeam = parseInt(btn.dataset.count);
            generateTeamInputs();
        });
    });
    
    // 초기 삭제 버튼 상태 업데이트
    updateRemoveButtons();
}

// 턴수 옵션 업데이트
function updateTurnLimitOptions() {
    const config = document.getElementById('turnLimitConfig');
    const group = document.getElementById('turnLimitGroup');
    
    // 턴수 설정이 있는 게임인지 확인
    const turnConfig = turnLimitOptions[gameState.type];
    
    if (turnConfig) {
        config.classList.add('show');
        group.innerHTML = '';
        
        turnConfig.options.forEach(turns => {
            const btn = document.createElement('button');
            btn.className = 'option-btn' + (turns === turnConfig.default ? ' selected' : '');
            btn.dataset.turns = turns;
            btn.textContent = `${turns}턴`;
            btn.addEventListener('click', () => {
                group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                gameState.maxTurns = turns;
            });
            group.appendChild(btn);
        });
        
        // 기본값 설정
        gameState.maxTurns = turnConfig.default;
    } else {
        config.classList.remove('show');
    }
}

// 팀 입력 필드 동적 생성
function generateTeamInputs() {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = '';
    
    for (let t = 0; t < teamConfig.teamCount; t++) {
        const teamSection = document.createElement('div');
        teamSection.className = 'team-section';
        teamSection.dataset.team = t + 1;
        
        let playersHtml = '';
        for (let p = 0; p < teamConfig.playersPerTeam; p++) {
            playersHtml += `
                <div class="player-input-group">
                    <label>선수 ${p + 1}</label>
                    <input type="text" placeholder="이름 입력" class="player-name">
                </div>
            `;
        }
        
        const teamLetter = String.fromCharCode(65 + t); // A, B, C, D...
        teamSection.innerHTML = `
            <h3>${teamLetter}팀</h3>
            <div class="player-inputs team-players">
                ${playersHtml}
            </div>
        `;
        
        container.appendChild(teamSection);
    }
}

// ===== 입력 모드 관련 함수 =====

// 입력 모드 전환
function switchInputMode(mode) {
    gameState.inputMode = mode;
    
    const dartboardMode = document.getElementById('dartboardMode');
    const gridMode = document.getElementById('gridMode');
    const dartboardBtn = document.getElementById('dartboardModeBtn');
    const gridBtn = document.getElementById('gridModeBtn');
    
    if (mode === 'dartboard') {
        dartboardMode.style.display = 'block';
        gridMode.style.display = 'none';
        dartboardBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        dartboardMode.style.display = 'none';
        gridMode.style.display = 'block';
        dartboardBtn.classList.remove('active');
        gridBtn.classList.add('active');
    }
    
    // 버튼 상태 동기화
    syncControlButtons();
}

// 컨트롤 버튼 상태 동기화
function syncControlButtons() {
    const dartCount = gameState.currentDarts.length;
    const undoDisabled = dartCount === 0;
    const confirmDisabled = dartCount < 3;
    
    // 다트판 모드 버튼
    const undoBtn = document.getElementById('undoBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    if (undoBtn) undoBtn.disabled = undoDisabled;
    if (confirmBtn) confirmBtn.disabled = confirmDisabled;
    
    // 격자 모드 버튼
    const gridUndoBtn = document.getElementById('gridUndoBtn');
    const gridConfirmBtn = document.getElementById('gridConfirmBtn');
    if (gridUndoBtn) gridUndoBtn.disabled = undoDisabled;
    if (gridConfirmBtn) gridConfirmBtn.disabled = confirmDisabled;
}

// 격자표 생성 (2단 배열: 왼쪽 20~11, 오른쪽 10~1)
function createScoreGrid() {
    const gridBody = document.getElementById('gridBody');
    if (!gridBody) return;
    
    gridBody.innerHTML = '';
    
    // 왼쪽: 20~11, 오른쪽: 10~1
    const leftNumbers = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11];
    const rightNumbers = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    
    for (let i = 0; i < 10; i++) {
        const leftNum = leftNumbers[i];
        const rightNum = rightNumbers[i];
        
        const row = document.createElement('div');
        row.className = 'grid-row-dual';
        row.innerHTML = `
            <div class="grid-cell-group">
                <div class="grid-number">${leftNum}</div>
                <button class="grid-btn single" onclick="handleGridClick(${leftNum}, 1)">S</button>
                <button class="grid-btn double" onclick="handleGridClick(${leftNum}, 2)">D</button>
                <button class="grid-btn triple" onclick="handleGridClick(${leftNum}, 3)">T</button>
            </div>
            <div class="grid-cell-group">
                <div class="grid-number">${rightNum}</div>
                <button class="grid-btn single" onclick="handleGridClick(${rightNum}, 1)">S</button>
                <button class="grid-btn double" onclick="handleGridClick(${rightNum}, 2)">D</button>
                <button class="grid-btn triple" onclick="handleGridClick(${rightNum}, 3)">T</button>
            </div>
        `;
        gridBody.appendChild(row);
    }
    
    // Bull + MISS 행 추가 (중앙 배치)
    const bullRow = document.createElement('div');
    bullRow.className = 'grid-row-bull';
    bullRow.innerHTML = `
        <div class="bull-miss-group">
            <button class="grid-btn single bull-btn" onclick="handleGridClick(25, 1)">25</button>
            <button class="grid-btn double bull-btn" onclick="handleGridClick(25, 2)">50</button>
            <button class="grid-btn miss-btn" onclick="handleGridMiss()">MISS</button>
        </div>
    `;
    gridBody.appendChild(bullRow);
}

// 격자 클릭 처리
function handleGridClick(baseNumber, multiplier) {
    if (gameState.currentDarts.length >= 3) {
        toastWarning('확인 버튼을 눌러 턴을 마무리하세요.', '다트 3개 완료');
        return;
    }
    
    const score = baseNumber * multiplier;
    
    gameState.currentDarts.push({ x: 250, y: 250, score: score, isFault: false });
    gameState.currentDartDetails.push({
        baseNumber: baseNumber,
        multiplier: multiplier,
        score: score,
        isFault: false
    });
    
    gameState.turnScore += score;
    
    // UI 업데이트
    updateTurnScoreDisplay();
    syncControlButtons();
    
    // 3개 완료 시 자동 활성화
    if (gameState.currentDarts.length === 3) {
        toastInfo('확인 버튼을 눌러 턴을 완료하세요.', '다트 3개 완료');
    }
}

// 격자 MISS 처리
function handleGridMiss() {
    if (gameState.currentDarts.length >= 3) {
        toastWarning('확인 버튼을 눌러 턴을 마무리하세요.', '다트 3개 완료');
        return;
    }
    
    gameState.currentDarts.push({ x: 250, y: 250, score: 0, isFault: true });
    gameState.currentDartDetails.push({
        baseNumber: 0,
        multiplier: 0,
        score: 0,
        isFault: true
    });
    
    // UI 업데이트
    updateTurnScoreDisplay();
    syncControlButtons();
    
    showFaultIndicator();
    
    if (gameState.currentDarts.length === 3) {
        toastInfo('확인 버튼을 눌러 턴을 완료하세요.', '다트 3개 완료');
    }
}

function createDartboard() {
    const svg = document.getElementById('dartboard');
    const cx = 250, cy = 250;
    
    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', 240);
    bg.setAttribute('fill', '#1a1a2e');
    bg.setAttribute('stroke', '#ffd700');
    bg.setAttribute('stroke-width', '3');
    svg.appendChild(bg);

    // Wire frame circle
    const wireCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    wireCircle.setAttribute('cx', cx);
    wireCircle.setAttribute('cy', cy);
    wireCircle.setAttribute('r', 220);
    wireCircle.setAttribute('fill', 'none');
    wireCircle.setAttribute('stroke', 'silver');
    wireCircle.setAttribute('stroke-width', '1');
    svg.appendChild(wireCircle);

    // Create segments with moderately enlarged Double and Triple areas
    // Original: Double 195-220(25px), Triple 105-120(15px)
    // Modified: Double 185-220(35px), Triple 100-135(35px) - easier to click but not too big
    const angleStep = 18; // 360 / 20
    
    for (let i = 0; i < 20; i++) {
        const startAngle = (i * angleStep - 99) * Math.PI / 180;
        const endAngle = ((i + 1) * angleStep - 99) * Math.PI / 180;
        
        // Double ring (outer) - enlarged from 25px to 35px
        createSegment(svg, cx, cy, 185, 220, startAngle, endAngle, i % 2 === 0 ? '#00a86b' : '#dc143c', segments[i] * 2);
        
        // Outer single
        createSegment(svg, cx, cy, 135, 185, startAngle, endAngle, i % 2 === 0 ? '#f5f5dc' : '#1a1a1a', segments[i]);
        
        // Triple ring - enlarged from 15px to 35px
        createSegment(svg, cx, cy, 100, 135, startAngle, endAngle, i % 2 === 0 ? '#00a86b' : '#dc143c', segments[i] * 3);
        
        // Inner single
        createSegment(svg, cx, cy, 30, 100, startAngle, endAngle, i % 2 === 0 ? '#f5f5dc' : '#1a1a1a', segments[i]);
    }

    // Bull's eye (outer) - slightly larger
    const outerBull = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerBull.setAttribute('cx', cx);
    outerBull.setAttribute('cy', cy);
    outerBull.setAttribute('r', 30);
    outerBull.setAttribute('fill', '#00a86b');
    outerBull.setAttribute('data-score', '25');
    outerBull.setAttribute('data-area', 'Single Bull');
    outerBull.style.cursor = 'crosshair';
    svg.appendChild(outerBull);

    // Bull's eye (inner) - slightly larger
    const innerBull = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerBull.setAttribute('cx', cx);
    innerBull.setAttribute('cy', cy);
    innerBull.setAttribute('r', 15);
    innerBull.setAttribute('fill', '#dc143c');
    innerBull.setAttribute('data-score', '50');
    innerBull.setAttribute('data-area', 'Double Bull');
    innerBull.style.cursor = 'crosshair';
    svg.appendChild(innerBull);

    // Add number labels
    for (let i = 0; i < 20; i++) {
        const angle = (i * 18 - 90) * Math.PI / 180;
        const x = cx + 232 * Math.cos(angle);
        const y = cy + 232 * Math.sin(angle);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#ffd700');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'Orbitron, sans-serif');
        text.textContent = segments[i];
        svg.appendChild(text);
    }

    // Add MISS button in top-left corner
    createMissButton(svg);

    // Add click event
    svg.addEventListener('click', handleDartThrow);
}

function createMissButton(svg) {
    // Miss button group - 우상단으로 이동
    const missGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    missGroup.setAttribute('class', 'miss-button');
    missGroup.style.cursor = 'pointer';
    
    // Miss circle background (우상단: cx=455)
    const missCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    missCircle.setAttribute('cx', 455);
    missCircle.setAttribute('cy', 45);
    missCircle.setAttribute('r', 35);
    missCircle.setAttribute('fill', '#333');
    missCircle.setAttribute('stroke', '#ff3366');
    missCircle.setAttribute('stroke-width', '3');
    missGroup.appendChild(missCircle);
    
    // Miss inner circle
    const missInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    missInner.setAttribute('cx', 455);
    missInner.setAttribute('cy', 45);
    missInner.setAttribute('r', 28);
    missInner.setAttribute('fill', '#1a1a1a');
    missInner.setAttribute('stroke', '#666');
    missInner.setAttribute('stroke-width', '1');
    missGroup.appendChild(missInner);
    
    // Miss text
    const missText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    missText.setAttribute('x', 455);
    missText.setAttribute('y', 50);
    missText.setAttribute('text-anchor', 'middle');
    missText.setAttribute('fill', '#ff3366');
    missText.setAttribute('font-size', '12');
    missText.setAttribute('font-weight', 'bold');
    missText.setAttribute('font-family', 'Orbitron, sans-serif');
    missText.textContent = 'MISS';
    missGroup.appendChild(missText);
    
    // Click event for miss button - capture click position
    missGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        const svg = document.getElementById('dartboard');
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (500 / rect.width);
        const y = (e.clientY - rect.top) * (500 / rect.height);
        handleMissClick(x, y);
    });
    
    svg.appendChild(missGroup);
}

function createSegment(svg, cx, cy, innerR, outerR, startAngle, endAngle, color, score) {
    const x1 = cx + innerR * Math.cos(startAngle);
    const y1 = cy + innerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(startAngle);
    const y2 = cy + outerR * Math.sin(startAngle);
    const x3 = cx + outerR * Math.cos(endAngle);
    const y3 = cy + outerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(endAngle);
    const y4 = cy + innerR * Math.sin(endAngle);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#c0c0c0');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('data-score', score);
    path.style.cursor = 'crosshair';
    svg.appendChild(path);
}

function handleDartThrow(e) {
    if (gameState.currentDarts.length >= 3) {
        toastWarning('확인 버튼을 눌러 턴을 마무리하세요.', '다트 3개 완료');
        return;
    }

    const svg = document.getElementById('dartboard');
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (500 / rect.width);
    const y = (e.clientY - rect.top) * (500 / rect.height);

    // Check if clicked on miss button area (top-right corner)
    if (x > 415 && y < 85) {
        return; // Miss button handles its own click
    }

    // Calculate score based on position
    const result = calculateScore(x, y);
    
    // If outside the board, ignore (user should use MISS button)
    if (result.score === 0) {
        return;
    }
    
    gameState.currentDarts.push({ x, y, score: result.score, isFault: false });
    gameState.currentDartDetails.push({
        baseNumber: result.baseNumber,
        multiplier: result.multiplier,
        score: result.score,
        isFault: false
    });
    
    gameState.turnScore += result.score;

    // Add dart marker at clicked position with number
    addDartMarker(x, y, gameState.currentDarts.length, false);

    // Update UI
    updateTurnScoreDisplay();
    syncControlButtons();
}

// 다트핀 SVG 아이콘 (사선으로 눕혀진 모양)
const dartPinSvg = `<span class="dart-pin-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 다트 뾰족한 끝 -->
    <path d="M2 22L7 17" stroke="#c0c0c0" stroke-width="2" stroke-linecap="round"/>
    <!-- 다트 바디 -->
    <path d="M7 17L12 12" stroke="#ff3366" stroke-width="3" stroke-linecap="round"/>
    <!-- 다트 배럴 -->
    <path d="M12 12L15 9" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
    <!-- 다트 샤프트 -->
    <path d="M15 9L18 6" stroke="#00d4ff" stroke-width="3" stroke-linecap="round"/>
    <!-- 다트 깃털 -->
    <path d="M18 6L22 2" stroke="#ff3366" stroke-width="2" stroke-linecap="round"/>
    <path d="M19 8L22 5" stroke="#ff3366" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M16 5L19 2" stroke="#ff3366" stroke-width="1.5" stroke-linecap="round"/>
</svg></span>`;

// 턴 점수를 "다트 + 다트 + 다트 = 0" → "20 + 다트 + 다트 = 20" 형식으로 표시
function updateTurnScoreDisplay() {
    // 다트판 아래 요소들
    const dartIndividualEl = document.getElementById('dartIndividualScores');
    const dartTotalEl = document.getElementById('dartTotalScore');
    
    // 3개의 다트 슬롯 생성 (점수 또는 다트 아이콘)
    const dartSlots = [];
    for (let i = 0; i < 3; i++) {
        if (i < gameState.currentDarts.length) {
            // 던진 다트는 점수로 표시
            dartSlots.push(`<span class="dart-score-item">${gameState.currentDarts[i].score}</span>`);
        } else {
            // 아직 안 던진 다트는 SVG 아이콘으로 표시
            dartSlots.push(dartPinSvg);
        }
    }
    
    const scoresHtml = dartSlots.join('<span class="dart-plus">+</span>');
    
    // 다트판 아래 업데이트
    if (dartIndividualEl) dartIndividualEl.innerHTML = scoresHtml;
    if (dartTotalEl) dartTotalEl.textContent = gameState.turnScore;
}

function showFaultIndicator() {
    const wrapper = document.getElementById('dartboardWrapper');
    
    // Remove existing indicator
    const existing = wrapper.querySelector('.fault-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'fault-indicator';
    indicator.textContent = '⚠ FAULT! 0점';
    wrapper.appendChild(indicator);
    
    // Remove after 1.5 seconds
    setTimeout(() => {
        indicator.remove();
    }, 1500);
}

function calculateScore(x, y) {
    const cx = 250, cy = 250;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if outside board
    if (distance > 220) return { score: 0, baseNumber: 0, multiplier: 0 };

    // Double bull - enlarged to r=15
    if (distance <= 15) return { score: 50, baseNumber: 25, multiplier: 2 };
    
    // Single bull - enlarged to r=30
    if (distance <= 30) return { score: 25, baseNumber: 25, multiplier: 1 };

    // Calculate angle to determine segment
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 99;
    if (angle < 0) angle += 360;
    const segmentIndex = Math.floor(angle / 18) % 20;
    const baseScore = segments[segmentIndex];

    // Determine multiplier based on distance (moderately enlarged for easier clicking)
    // Inner single: 30-100
    // Triple: 100-135 (enlarged from 15px to 35px)
    // Outer single: 135-185
    // Double: 185-220 (enlarged from 25px to 35px)
    if (distance <= 100) return { score: baseScore, baseNumber: baseScore, multiplier: 1 }; // Inner single
    if (distance <= 135) return { score: baseScore * 3, baseNumber: baseScore, multiplier: 3 }; // Triple
    if (distance <= 185) return { score: baseScore, baseNumber: baseScore, multiplier: 1 }; // Outer single
    if (distance <= 220) return { score: baseScore * 2, baseNumber: baseScore, multiplier: 2 }; // Double

    return { score: 0, baseNumber: 0, multiplier: 0 };
}

function handleMissClick(x, y) {
    if (gameState.currentDarts.length >= 3) {
        toastWarning('확인 버튼을 눌러 턴을 마무리하세요.', '다트 3개 완료');
        return;
    }
    
    const dartNumber = gameState.currentDarts.length + 1;
    
    // Record miss at clicked position
    gameState.currentDarts.push({ x, y, score: 0, isFault: true });
    gameState.currentDartDetails.push({
        baseNumber: 0,
        multiplier: 0,
        score: 0,
        isFault: true
    });

    // Add dart marker at clicked position within miss area
    addDartMarker(x, y, dartNumber, true);
    
    // Show fault indicator
    showFaultIndicator();

    // Update UI
    updateTurnScoreDisplay();
    syncControlButtons();
}

function addDartMarker(x, y, number, isFault = false) {
    const wrapper = document.getElementById('dartboardWrapper');
    const svg = document.getElementById('dartboard');
    const rect = svg.getBoundingClientRect();
    
    const marker = document.createElement('div');
    marker.className = isFault ? 'dart-mark fault' : 'dart-mark';
    marker.style.left = `${(x / 500) * rect.width}px`;
    marker.style.top = `${(y / 500) * rect.height}px`;
    
    // 해당 위치의 색상 영역 판단하여 대비 색상 적용
    const colors = getContrastColors(x, y, isFault);
    
    marker.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${colors.bg}" stroke="${colors.stroke}" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" fill="${colors.text}" font-size="12" font-weight="bold" font-family="Orbitron, sans-serif">${number}</text>
        </svg>
    `;
    marker.dataset.index = number - 1;
    wrapper.appendChild(marker);
}

// 다트판 위치에 따른 대비 색상 반환
function getContrastColors(x, y, isFault) {
    if (isFault) {
        return { bg: '#333333', stroke: '#ff3366', text: '#ffffff' };
    }
    
    const cx = 250, cy = 250;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 불 영역
    if (distance <= 15) {
        // Double bull (빨간색) → 흰색 배경
        return { bg: '#ffffff', stroke: '#ffd700', text: '#dc143c' };
    }
    if (distance <= 30) {
        // Single bull (초록색) → 흰색 배경
        return { bg: '#ffffff', stroke: '#ffd700', text: '#00a86b' };
    }
    
    // 세그먼트 인덱스 계산
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 99;
    if (angle < 0) angle += 360;
    const segmentIndex = Math.floor(angle / 18) % 20;
    const isEvenSegment = segmentIndex % 2 === 0;
    
    // 영역별 색상 판단
    // Double (185-220), Outer single (135-185), Triple (100-135), Inner single (30-100)
    const isDoubleOrTriple = (distance > 185 && distance <= 220) || (distance > 100 && distance <= 135);
    
    if (isDoubleOrTriple) {
        // Double/Triple 영역 (초록 또는 빨강)
        if (isEvenSegment) {
            // 초록색 영역 → 흰색 배경, 초록 텍스트
            return { bg: '#ffffff', stroke: '#ffd700', text: '#00a86b' };
        } else {
            // 빨간색 영역 → 흰색 배경, 빨강 텍스트
            return { bg: '#ffffff', stroke: '#ffd700', text: '#dc143c' };
        }
    } else {
        // Single 영역 (베이지 또는 검정)
        if (isEvenSegment) {
            // 밝은색(베이지) 영역 → 어두운 배경
            return { bg: '#1a1a2e', stroke: '#ffd700', text: '#ffffff' };
        } else {
            // 어두운색(검정) 영역 → 밝은 배경
            return { bg: '#f5f5dc', stroke: '#ffd700', text: '#1a1a1a' };
        }
    }
}

function undoThrow() {
    if (gameState.currentDarts.length === 0) return;

    const lastDart = gameState.currentDarts.pop();
    gameState.currentDartDetails.pop();
    gameState.turnScore -= lastDart.score;

    // Remove marker (다트판 모드에서만)
    const markers = document.querySelectorAll('.dart-mark');
    if (markers.length > 0) {
        markers[markers.length - 1].remove();
    }

    // Update UI
    updateTurnScoreDisplay();
    syncControlButtons();
}

function confirmTurn() {
    const currentPlayer = getCurrentPlayer();
    let roundScore = gameState.turnScore; // 이번 턴 점수
    
    // Update score based on game type
    if (gameState.type === '501' || gameState.type === '301') {
        let currentScore = getCurrentScore(currentPlayer);
        currentScore -= gameState.turnScore;
        
        // Check for bust (went below 0 or exactly 0 without double)
        if (currentScore < 0) {
            // Bust - restore score (점수 변경 없음)
            roundScore = 0; // 버스트시 0점 기록
        } else {
            setCurrentScore(currentPlayer, currentScore);
            
            if (currentScore === 0) {
                // 라운드 점수 저장 후 승리
                gameState.roundScores[currentPlayer.id].push(roundScore);
                endGame(currentPlayer);
                return;
            }
        }
        
        // 라운드별 점수 저장
        gameState.roundScores[currentPlayer.id].push(roundScore);
        
        // Check turn limit for 501/301
        if (checkTurnLimitExceeded()) {
            const winner = get01Winner();
            endGame(winner, true); // true = 턴 제한으로 종료
            return;
        }
    } else if (gameState.type === 'cricket') {
        // Cricket scoring logic
        processCricketTurn(currentPlayer);
        
        // 라운드별 점수 저장
        gameState.roundScores[currentPlayer.id].push(roundScore);
        
        // Check for cricket winner
        const winner = checkCricketWinner();
        if (winner) {
            endGame(winner);
            return;
        }
    } else if (gameState.type === 'countup') {
        // Count-up: simply add score
        gameState.scores[currentPlayer.id] += gameState.turnScore;
        
        // 라운드별 점수 저장
        gameState.roundScores[currentPlayer.id].push(roundScore);
        
        // Check if all rounds completed
        if (checkCountupComplete()) {
            const winner = getCountupWinner();
            endGame(winner);
            return;
        }
    } else if (gameState.type === 'around') {
        // Around the clock logic (simplified)
        gameState.scores[currentPlayer.id] += gameState.turnScore;
        
        // 라운드별 점수 저장
        gameState.roundScores[currentPlayer.id].push(roundScore);
    }

    // 현재 턴 점수 저장 (TTS용)
    const earnedScore = gameState.turnScore;
    
    // Clear darts
    clearDarts();

    // Next player
    nextPlayer();
    
    // TTS: 점수 및 다음 플레이어 안내
    const nextPlayerInfo = getCurrentPlayer();
    const nextPlayerName = gameState.mode === 'team' 
        ? `${nextPlayerInfo.team} ${nextPlayerInfo.name}` 
        : nextPlayerInfo.name;
    speak(`${earnedScore}점을 획득하였습니다. 다음 플레이어는 ${nextPlayerName}입니다.`);
}

// 턴 제한 초과 확인 (501/301)
function checkTurnLimitExceeded() {
    if (gameState.type !== '501' && gameState.type !== '301') return false;
    if (!turnLimitOptions[gameState.type]) return false;
    
    const allPlayers = getAllPlayers();
    const totalPlayers = allPlayers.length;
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % totalPlayers;
    const nextRound = nextPlayerIndex === 0 ? gameState.round + 1 : gameState.round;
    
    return nextRound > gameState.maxTurns && nextPlayerIndex === 0;
}

// 501/301 승자 결정 (턴 제한 시)
function get01Winner() {
    const allPlayers = getAllPlayers();
    
    // 남은 점수가 가장 적은 선수/팀이 승자
    let winner = allPlayers[0];
    let lowestScore = getCurrentScore(winner);
    
    for (const player of allPlayers) {
        const playerScore = getCurrentScore(player);
        if (playerScore < lowestScore) {
            lowestScore = playerScore;
            winner = player;
        }
    }
    
    return winner;
}

function processCricketTurn(player) {
    const playerCricket = gameState.cricketScores[player.id];
    let turnPoints = 0;
    
    // Process each dart
    gameState.currentDartDetails.forEach(dart => {
        // Skip faults
        if (dart.isFault) return;
        
        const num = dart.baseNumber;
        const hits = dart.multiplier;
        
        // Only cricket numbers count
        if (!cricketNumbers.includes(num)) return;
        
        // Current hits before this throw
        const currentHits = playerCricket[num];
        
        if (currentHits >= 3) {
            // Already closed - check if can score
            if (canScoreOnNumber(player.id, num)) {
                turnPoints += num * hits;
            }
        } else {
            // Not yet closed
            const hitsToClose = 3 - currentHits;
            const closingHits = Math.min(hits, hitsToClose);
            const scoringHits = hits - closingHits;
            
            playerCricket[num] += closingHits;
            
            // If now closed and has extra hits, score them
            if (playerCricket[num] >= 3 && scoringHits > 0) {
                if (canScoreOnNumber(player.id, num)) {
                    turnPoints += num * scoringHits;
                }
            }
        }
    });
    
    gameState.scores[player.id] += turnPoints;
    updateCricketBoard();
}

function canScoreOnNumber(playerId, num) {
    // Can score if at least one other player hasn't closed this number
    const allPlayers = getAllPlayers();
    return allPlayers.some(p => p.id !== playerId && gameState.cricketScores[p.id][num] < 3);
}

function getAllPlayers() {
    if (gameState.mode === 'individual') {
        return gameState.players;
    } else {
        return gameState.teams.flatMap(team => team.players);
    }
}

function checkCricketWinner() {
    const allPlayers = getAllPlayers();
    
    for (const player of allPlayers) {
        const cricket = gameState.cricketScores[player.id];
        const allClosed = cricketNumbers.every(num => cricket[num] >= 3);
        
        if (allClosed) {
            // Check if has highest or tied highest score
            const playerScore = gameState.scores[player.id];
            const highestOtherScore = Math.max(...allPlayers
                .filter(p => p.id !== player.id)
                .map(p => gameState.scores[p.id]));
            
            if (playerScore >= highestOtherScore) {
                return player;
            }
        }
    }
    
    return null;
}

function checkCountupComplete() {
    // Check if current round exceeds total rounds after this turn
    const allPlayers = getAllPlayers();
    const totalPlayers = allPlayers.length;
    
    // After this turn, check if we've completed all rounds
    // Round increments when currentPlayerIndex wraps back to 0
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % totalPlayers;
    const nextRound = nextPlayerIndex === 0 ? gameState.round + 1 : gameState.round;
    
    return nextRound > gameState.maxTurns && nextPlayerIndex === 0;
}

function getCountupWinner() {
    if (gameState.mode === 'team') {
        // 팀전: 팀 합계 점수로 승자 결정
        let winningTeam = null;
        let highestTeamScore = -1;
        
        gameState.teams.forEach(team => {
            let teamTotal = 0;
            team.players.forEach(player => {
                const roundScores = gameState.roundScores[player.id] || [];
                teamTotal += roundScores.reduce((sum, s) => sum + s, 0);
            });
            
            if (teamTotal > highestTeamScore) {
                highestTeamScore = teamTotal;
                winningTeam = team;
            }
        });
        
        // 우승 팀의 첫 번째 선수를 반환 (팀명 표시용)
        if (winningTeam) {
            return { ...winningTeam.players[0], team: winningTeam.name, isTeamWin: true };
        }
    }
    
    // 개인전: 개인 점수로 승자 결정
    const allPlayers = getAllPlayers();
    let winner = allPlayers[0];
    let highestScore = gameState.scores[winner.id];
    
    for (const player of allPlayers) {
        if (gameState.scores[player.id] > highestScore) {
            highestScore = gameState.scores[player.id];
            winner = player;
        }
    }
    
    return winner;
}

function updateCricketBoard() {
    const board = document.getElementById('cricketBoard');
    if (gameState.type !== 'cricket') {
        board.style.display = 'none';
        return;
    }
    
    board.style.display = 'grid';
    board.innerHTML = '';
    
    const allPlayers = getAllPlayers();
    
    cricketNumbers.forEach(num => {
        const div = document.createElement('div');
        div.className = 'cricket-number';
        
        // Check if all players closed this number
        const allClosed = allPlayers.every(p => gameState.cricketScores[p.id][num] >= 3);
        if (allClosed) div.classList.add('closed');
        
        const displayNum = num === 25 ? 'BULL' : num;
        
        let playerMarksHtml = '';
        allPlayers.forEach(p => {
            const hits = gameState.cricketScores[p.id][num];
            const marksHtml = getMarksHtml(hits);
            const closedClass = hits >= 3 ? 'closed' : '';
            playerMarksHtml += `
                <div class="player-cricket-row ${closedClass}">
                    <span class="name">${p.name}</span>
                    <span class="hits">${marksHtml}</span>
                </div>
            `;
        });
        
        div.innerHTML = `
            <div class="number">${displayNum}</div>
            <div class="player-marks">${playerMarksHtml}</div>
        `;
        
        board.appendChild(div);
    });
}

function getMarksHtml(hits) {
    if (hits === 0) return '-';
    if (hits === 1) return '/';
    if (hits === 2) return 'X';
    return '⊗'; // Closed (circled X)
}

function clearDarts() {
    gameState.currentDarts = [];
    gameState.currentDartDetails = [];
    gameState.turnScore = 0;
    document.querySelectorAll('.dart-mark').forEach(m => m.remove());
    updateTurnScoreDisplay();
    syncControlButtons();
}

function nextPlayer() {
    if (gameState.mode === 'individual') {
        gameState.currentPlayerIndex++;
        if (gameState.currentPlayerIndex >= gameState.players.length) {
            gameState.currentPlayerIndex = 0;
            gameState.round++;
        }
    } else {
        // 팀전: 다른 팀으로 턴 넘김
        gameState.currentTeamIndex++;
        
        if (gameState.currentTeamIndex >= gameState.teams.length) {
            // 모든 팀이 한 번씩 던졌으면 다시 첫 번째 팀으로
            gameState.currentTeamIndex = 0;
            
            // 각 팀의 다음 선수로 이동
            let allTeamsCompleted = true;
            for (let i = 0; i < gameState.teams.length; i++) {
                gameState.teamPlayerIndices[i]++;
                if (gameState.teamPlayerIndices[i] < gameState.teams[i].players.length) {
                    allTeamsCompleted = false;
                }
            }
            
            // 모든 팀의 모든 선수가 던졌으면 다음 라운드
            if (allTeamsCompleted) {
                gameState.round++;
                // 각 팀의 선수 인덱스 초기화
                for (let i = 0; i < gameState.teams.length; i++) {
                    gameState.teamPlayerIndices[i] = 0;
                }
            }
        }
        
        // 현재 팀의 현재 선수가 범위를 벗어났으면 다음 팀으로
        while (gameState.teamPlayerIndices[gameState.currentTeamIndex] >= 
               gameState.teams[gameState.currentTeamIndex].players.length) {
            gameState.currentTeamIndex++;
            if (gameState.currentTeamIndex >= gameState.teams.length) {
                gameState.currentTeamIndex = 0;
            }
        }
    }

    updateDisplay();
}

function getCurrentPlayer() {
    if (gameState.mode === 'individual') {
        return gameState.players[gameState.currentPlayerIndex];
    } else {
        // 팀전: 현재 팀의 현재 선수 반환
        const team = gameState.teams[gameState.currentTeamIndex];
        const playerIndex = gameState.teamPlayerIndices[gameState.currentTeamIndex];
        const player = team.players[playerIndex];
        return { ...player, team: team.name };
    }
}

function updateDisplay() {
    const currentPlayer = getCurrentPlayer();
    const playerDisplayName = gameState.mode === 'team' 
        ? `${currentPlayer.team} - ${currentPlayer.name}` 
        : currentPlayer.name;
    
    // 다트판 아래 선수 이름
    const currentPlayerDisplayEl = document.getElementById('currentPlayerDisplay');
    if (currentPlayerDisplayEl) {
        currentPlayerDisplayEl.textContent = playerDisplayName;
    }
    
    // Update scoreboard
    updateScoreboard();
    
    // Update cricket board if playing cricket
    if (gameState.type === 'cricket') {
        updateCricketBoard();
    }
}

function updateScoreboard() {
    const header = document.getElementById('scoreHeader');
    const body = document.getElementById('scoreBody');
    
    header.innerHTML = '';
    body.innerHTML = '';

    const allPlayers = getAllPlayers();
    const maxRounds = gameState.maxTurns || 10;
    const currentMaxRound = Math.max(...allPlayers.map(p => (gameState.roundScores[p.id] || []).length), 1);

    if (gameState.type === 'cricket') {
        // Cricket scoreboard - 기존 방식 유지
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>#</th><th>선수</th><th>점수</th><th>상태</th>';
        header.appendChild(headerRow);

        // 원래 순서 유지
        const displayPlayers = allPlayers;

        displayPlayers.forEach((player, index) => {
            const row = document.createElement('tr');
            if (player.id === getCurrentPlayer().id) {
                row.classList.add('current-player');
            }
            
            const closedCount = cricketNumbers.filter(n => gameState.cricketScores[player.id][n] >= 3).length;
            const statusText = `${closedCount}/${cricketNumbers.length} 닫힘`;
            
            // 선수 이름 (팀전이면 팀명 포함)
            const playerName = gameState.mode === 'team' && player.team
                ? `${player.team} - ${player.name}` 
                : player.name;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${playerName}</td>
                <td class="total-score">${gameState.scores[player.id]}</td>
                <td>${statusText}</td>
            `;
            body.appendChild(row);
        });
    } else {
        // 라운드별 점수판 (카운트업, 501, 301, 어라운드)
        const headerRow = document.createElement('tr');
        let headerHtml = '<th class="player-col">선수</th>';
        
        // 라운드 헤더
        for (let r = 1; r <= maxRounds; r++) {
            headerHtml += `<th class="round-col">R${r}</th>`;
        }
        
        // 합계 헤더
        headerHtml += '<th class="total-col">합계</th>';
        
        // 501/301은 남은 점수 표시
        if (gameState.type === '501' || gameState.type === '301') {
            headerHtml += '<th class="remain-col">남은</th>';
        }
        
        headerRow.innerHTML = headerHtml;
        header.appendChild(headerRow);

        // 원래 순서 유지
        const displayPlayers = allPlayers;

        // 팀전인 경우 팀별로 그룹화하여 표시
        if (gameState.mode === 'team') {
            gameState.teams.forEach((team, teamIndex) => {
                let teamTotalScore = 0;
                
                // 팀의 각 선수 행 추가
                team.players.forEach((player) => {
                    const row = document.createElement('tr');
                    if (player.id === getCurrentPlayer().id) {
                        row.classList.add('current-player');
                    }
                    
                    const roundScores = gameState.roundScores[player.id] || [];
                    const playerTotal = roundScores.reduce((sum, s) => sum + s, 0);
                    teamTotalScore += playerTotal;
                    
                    let rowHtml = `<td class="player-col">${team.name} - ${player.name}</td>`;
                    
                    for (let r = 0; r < maxRounds; r++) {
                        const score = roundScores[r];
                        rowHtml += `<td class="round-col">${score !== undefined ? score : '-'}</td>`;
                    }
                    
                    rowHtml += `<td class="total-col">${playerTotal}</td>`;
                    
                    if (gameState.type === '501' || gameState.type === '301') {
                        rowHtml += `<td class="remain-col">-</td>`;
                    }

                    row.innerHTML = rowHtml;
                    body.appendChild(row);
                });
                
                // 팀 합계 행 추가
                const teamRow = document.createElement('tr');
                teamRow.className = 'team-total-row';
                
                let teamRowHtml = `<td class="player-col team-name">📊 ${team.name} 합계</td>`;
                for (let r = 0; r < maxRounds; r++) {
                    teamRowHtml += `<td class="round-col">-</td>`;
                }
                teamRowHtml += `<td class="total-col total-score">${teamTotalScore}</td>`;
                
                if (gameState.type === '501' || gameState.type === '301') {
                    const teamRemain = gameState.teamScores[team.name];
                    teamRowHtml += `<td class="remain-col total-score">${teamRemain}</td>`;
                }
                
                teamRow.innerHTML = teamRowHtml;
                body.appendChild(teamRow);
            });
        } else {
            // 개인전
            displayPlayers.forEach((player) => {
                const row = document.createElement('tr');
                if (player.id === getCurrentPlayer().id) {
                    row.classList.add('current-player');
                }
                
                const roundScores = gameState.roundScores[player.id] || [];
                const totalScore = roundScores.reduce((sum, s) => sum + s, 0);
                
                let rowHtml = `<td class="player-col">${player.name}</td>`;
                
                for (let r = 0; r < maxRounds; r++) {
                    const score = roundScores[r];
                    rowHtml += `<td class="round-col">${score !== undefined ? score : '-'}</td>`;
                }
                
                rowHtml += `<td class="total-col total-score">${totalScore}</td>`;
                
                if (gameState.type === '501' || gameState.type === '301') {
                    const remainScore = getCurrentScore(player);
                    rowHtml += `<td class="remain-col">${remainScore}</td>`;
                }

                row.innerHTML = rowHtml;
                body.appendChild(row);
            });
        }
    }
}

function addIndividualPlayer() {
    const container = document.getElementById('individualPlayers');
    const count = container.children.length;
    
    if (count >= 4) {
        showAlert('최대 4명까지 등록 가능합니다.', '🚫');
        return;
    }

    const div = document.createElement('div');
    div.className = 'player-input-group';
    div.innerHTML = `
        <label>선수 ${count + 1}</label>
        <input type="text" placeholder="이름 입력" class="player-name">
        <button class="remove-player-btn" onclick="removePlayer(this)">✕</button>
    `;
    container.appendChild(div);
    updateRemoveButtons();
}

function removePlayer(btn) {
    const group = btn.closest('.player-input-group');
    const container = group.parentElement;
    group.remove();
    
    // Renumber players
    container.querySelectorAll('.player-input-group').forEach((g, i) => {
        g.querySelector('label').textContent = `선수 ${i + 1}`;
    });
    
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const container = document.getElementById('individualPlayers');
    const buttons = container.querySelectorAll('.remove-player-btn');
    buttons.forEach((btn, i) => {
        btn.style.display = buttons.length > 1 ? 'block' : 'none';
    });
}

function startGame() {
    // Collect players
    if (gameState.mode === 'individual') {
        const inputs = document.querySelectorAll('#individualPlayers .player-name');
        gameState.players = [];
        inputs.forEach((input, i) => {
            const name = input.value.trim() || `선수 ${i + 1}`;
            gameState.players.push({ id: `p${i}`, name });
        });

        if (gameState.players.length < 1) {
            showAlert('최소 1명의 선수를 등록해주세요.', '🎯');
            return;
        }
    } else {
        gameState.teams = [];
        gameState.teamPlayerIndices = [];
        gameState.currentTeamIndex = 0;
        document.querySelectorAll('.team-section').forEach((section, ti) => {
            const teamLetter = String.fromCharCode(65 + ti); // A, B, C, D...
            const teamName = `${teamLetter}팀`;
            const players = [];
            section.querySelectorAll('.team-players .player-name').forEach((input, pi) => {
                const name = input.value.trim() || `선수${pi + 1}`;
                players.push({ id: `t${ti}p${pi}`, name, team: teamName });
            });
            gameState.teams.push({ name: teamName, players });
            gameState.teamPlayerIndices.push(0); // 각 팀의 첫 번째 선수부터 시작
        });
    }

    // Initialize scores
    const startScore = gameState.type === '501' ? 501 : gameState.type === '301' ? 301 : 0;
    
    const allPlayers = gameState.mode === 'individual' 
        ? gameState.players 
        : gameState.teams.flatMap(team => team.players);
    
    // 팀 점수 초기화 (301/501 팀전용)
    gameState.teamScores = {};
    if (gameState.mode === 'team' && (gameState.type === '501' || gameState.type === '301')) {
        gameState.teams.forEach(team => {
            gameState.teamScores[team.name] = startScore;
        });
    }
    
    allPlayers.forEach(p => {
        gameState.scores[p.id] = startScore;
        gameState.roundScores[p.id] = []; // 라운드별 점수 초기화
        
        // Initialize cricket scores
        if (gameState.type === 'cricket') {
            gameState.cricketScores[p.id] = {};
            cricketNumbers.forEach(num => {
                gameState.cricketScores[p.id][num] = 0;
            });
        }
    });

    // Update game type display
    document.getElementById('currentGameType').textContent = gameTypeNames[gameState.type];

    // Show game screen
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Show/hide cricket board
    document.getElementById('cricketBoard').style.display = gameState.type === 'cricket' ? 'grid' : 'none';
    
    // 격자표 생성
    createScoreGrid();
    
    // 입력 모드 초기화 (다트판 모드로 시작)
    switchInputMode('dartboard');
    
    updateDisplay();
    updateTurnScoreDisplay();
    
    if (gameState.type === 'cricket') {
        updateCricketBoard();
    }
    
    // TTS: 게임 시작 안내 + 첫 번째 플레이어 안내
    const gameName = gameTypeNames[gameState.type];
    const firstPlayer = getCurrentPlayer();
    const firstPlayerName = gameState.mode === 'team' 
        ? `${firstPlayer.team} ${firstPlayer.name}` 
        : firstPlayer.name;
    speak(`${gameName} 게임을 시작합니다. ${firstPlayerName}님 쏘세요!`);
}

function endGame(winner) {
    let winnerName;
    
    if (winner.isTeamWin) {
        // 팀 합계로 우승한 경우 팀명만 표시
        winnerName = `🏆 ${winner.team}`;
    } else if (gameState.mode === 'team') {
        // 팀전에서 개인이 우승한 경우 (301/501 등)
        winnerName = `${winner.team} - ${winner.name}`;
    } else {
        winnerName = winner.name;
    }
    
    document.getElementById('winnerName').textContent = winnerName;
    document.getElementById('winnerModal').style.display = 'flex';
    
    // TTS: 우승자 안내
    speak(`${winnerName} 우승을 축하합니다!`);
    
    // Confetti!
    createConfetti();
}

function createConfetti() {
    const colors = ['#ffd700', '#ff3366', '#00ff88', '#00d4ff', '#ff6b35', '#9b59b6'];
    
    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }, i * 30);
    }
}

async function exitGame() {
    const confirmed = await showConfirm('게임을 종료하시겠습니까?\n현재 진행 상황이 저장되지 않습니다.', '🚪');
    if (confirmed) {
        resetGame();
    }
}

function resetGame() {
    document.getElementById('winnerModal').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('cricketBoard').style.display = 'none';
    
    // 현재 선택된 게임 타입 확인
    const selectedTypeBtn = document.querySelector('#gameTypeGroup .option-btn.selected');
    const selectedType = selectedTypeBtn ? selectedTypeBtn.dataset.type : 'countup';
    
    // 현재 선택된 모드 확인
    const selectedModeBtn = document.querySelector('#gameModeGroup .option-btn.selected');
    const selectedMode = selectedModeBtn ? selectedModeBtn.dataset.mode : 'individual';
    
    // 현재 선택된 턴수 확인
    const selectedTurnBtn = document.querySelector('#turnLimitGroup .option-btn.selected');
    const defaultTurns = turnLimitOptions[selectedType]?.default || 5;
    const selectedTurns = selectedTurnBtn ? parseInt(selectedTurnBtn.dataset.turns) : defaultTurns;
    
    // Reset state
    gameState = {
        type: selectedType,
        mode: selectedMode,
        players: [],
        teams: [],
        currentPlayerIndex: 0,
        currentTeamIndex: 0,
        teamPlayerIndices: [],
        currentDarts: [],
        currentDartDetails: [],
        turnScore: 0,
        round: 1,
        maxTurns: selectedTurns,
        scores: {},
        roundScores: {},
        cricketScores: {},
        inputMode: 'dartboard'
    };
    
    clearDarts();
    
    // 턴수 옵션 초기화
    updateTurnLimitOptions();
}
