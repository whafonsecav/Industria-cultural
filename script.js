document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const slides = document.querySelectorAll('.slide');
    const slidesWrapper = document.querySelector('.slides-wrapper');
    const navContainer = document.getElementById('slide-nav-container');
    const slideHeader = document.getElementById('slide-header');
    const modalOverlay = document.getElementById('modal-overlay');
    const presentationFrame = document.querySelector('.presentation-frame');
    const quizAudio = document.getElementById('quiz-audio');

    // --- ESTADO INICIAL ---
    let currentIndex = 0;
    const totalSlides = slides.length;
    let commentInterval = null;
    let shakeInterval = null;
    let touchstartX = 0;
    let touchendX = 0;
    const SWIPE_THRESHOLD = 50;
    
    // --- ESTADO DEL SORTEO Y QUIZ ---
    let raffleParticipants = 0;
    let availableRaffleNumbers = [];
    let selectedOption = null;
    let quizTimer = null;
    let timerDangerTimeout = null;
    
    // --- Lógica para el desenfoque de 'Anatomía de un Post' ---
    const anatomyColumn = document.getElementById('post-anatomy-col');
    if (anatomyColumn) {
        anatomyColumn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (!anatomyColumn.classList.contains('revealed')) {
                anatomyColumn.classList.add('revealed');
            }
        });
    }

    // --- CREACIÓN DE LA NAVEGACIÓN ---
    const prevBtn = document.createElement('button');
    prevBtn.classList.add('nav-arrow');
    prevBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    prevBtn.ariaLabel = 'Previous slide';
    navContainer.appendChild(prevBtn);

    const navNumbersWrapper = document.createElement('div');
    navNumbersWrapper.style.display = 'flex';
    navNumbersWrapper.style.gap = '0.5rem';
    
    for (let i = 0; i < totalSlides; i++) {
        const numBtn = document.createElement('button');
        numBtn.classList.add('nav-number-btn');
        numBtn.textContent = i + 1;
        numBtn.ariaLabel = `Go to slide ${i + 1}`;
        numBtn.addEventListener('click', () => goToSlide(i));
        navNumbersWrapper.appendChild(numBtn);
    }
    navContainer.appendChild(navNumbersWrapper);

    const nextBtn = document.createElement('button');
    nextBtn.classList.add('nav-arrow');
    nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    nextBtn.ariaLabel = 'Next slide';
    navContainer.appendChild(nextBtn);

    const navNumberBtns = navNumbersWrapper.querySelectorAll('.nav-number-btn');

    // --- LÓGICA DE MODALES (SORTEO Y QUIZ) ---
    const raffleModal = document.getElementById('raffle-modal');
    const quizConfirmModal = document.getElementById('quiz-confirm-modal');
    const quizSuspenseModal = document.getElementById('quiz-suspense-modal');
    const quizResultModal = document.getElementById('quiz-result-modal');

    function showModal(modal) {
        modalOverlay.classList.add('visible');
        [raffleModal, quizConfirmModal, quizSuspenseModal, quizResultModal].forEach(m => m.classList.add('hidden'));
        modal.classList.remove('hidden');
    }

    function hideModals() {
        modalOverlay.classList.remove('visible');
    }

    // --- LÓGICA DEL SORTEO ---
    const raffleInputDisplay = document.getElementById('raffle-input-display');
    const raffleRunView = document.getElementById('raffle-run-view');
    const raffleInputView = document.getElementById('raffle-input-view');
    const raffleAnimationDisplay = document.getElementById('raffle-animation-display');
    const raffleResultView = document.getElementById('raffle-result-view');
    const raffleStartBtn = document.getElementById('raffle-start-btn');
    const raffleContinueBtn = document.getElementById('raffle-continue-btn');
    const raffleSkipBtn = document.getElementById('raffle-skip-btn');
    const raffleBackBtn = document.getElementById('raffle-back-btn');

    document.getElementById('raffle-accept-btn').addEventListener('click', () => {
        const num = parseInt(raffleInputDisplay.value, 10);
        if (num > 0) {
            if (raffleParticipants !== num) {
                raffleParticipants = num;
                availableRaffleNumbers = Array.from({ length: raffleParticipants }, (_, i) => i + 1);
            }
            raffleInputView.classList.add('hidden');
            raffleRunView.classList.remove('hidden');
            raffleRunView.focus();
        }
    });
    
    raffleSkipBtn.addEventListener('click', () => {
        hideModals();
        goToSlide(currentIndex + 1); 
    });

    raffleBackBtn.addEventListener('click', () => {
        raffleRunView.classList.add('hidden');
        raffleInputView.classList.remove('hidden');
    });

    const startRaffle = () => {
        if (raffleStartBtn.disabled) return;
        raffleStartBtn.disabled = true;
        raffleBackBtn.classList.add('hidden');
        let animationInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * availableRaffleNumbers.length);
            raffleAnimationDisplay.textContent = availableRaffleNumbers.length > 0 ? availableRaffleNumbers[randomIndex] : '??';
        }, 80);

        setTimeout(() => {
            clearInterval(animationInterval);
            if(availableRaffleNumbers.length === 0){
                 availableRaffleNumbers = Array.from({ length: raffleParticipants }, (_, i) => i + 1);
            }
            const winnerIndex = Math.floor(Math.random() * availableRaffleNumbers.length);
            const winner = availableRaffleNumbers[winnerIndex];
            raffleAnimationDisplay.textContent = winner;
            availableRaffleNumbers.splice(winnerIndex, 1);
            raffleResultView.classList.remove('hidden');
        }, 3000);
    };

    raffleStartBtn.addEventListener('click', startRaffle);
    raffleRunView.addEventListener('keydown', (e) => { if(e.key === 'Enter') startRaffle(); });
    
    raffleContinueBtn.addEventListener('click', () => {
        hideModals();
        goToSlide(currentIndex + 1);
    });

    // --- LÓGICA DE QUIZ INTERACTIVO ---
    function startTimer(slide) {
        const timerBar = slide.querySelector('.timer-bar');
        const quizBox = slide.querySelector('.quiz-box');
        if (!timerBar) return;

        if (quizAudio) {
            quizAudio.currentTime = 0;
            quizAudio.play().catch(e => console.log("La reproducción automática de audio fue bloqueada."));
        }

        slide.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'auto');
        
        quizBox.classList.remove('running');
        void quizBox.offsetWidth; 
        quizBox.classList.add('running');
        
        timerBar.classList.remove('running');
        void timerBar.offsetWidth;
        timerBar.classList.add('running');
        
        clearTimeout(quizTimer);
        clearTimeout(timerDangerTimeout);

        timerDangerTimeout = setTimeout(() => {
            presentationFrame.classList.add('quiz-danger-mode');
        }, 48000);

        quizTimer = setTimeout(() => {
            // No hacer nada
        }, 60000);
    }

    function stopTimer() {
        clearTimeout(quizTimer);
        clearTimeout(timerDangerTimeout);

        if (quizAudio) {
            quizAudio.pause();
            quizAudio.currentTime = 0;
        }

        const currentSlide = slides[currentIndex];
        if (currentSlide && currentSlide.classList.contains('quiz-slide')) {
            const timerBar = currentSlide.querySelector('.timer-bar');
            const quizBox = currentSlide.querySelector('.quiz-box');
            if (timerBar) timerBar.classList.remove('running');
            if (quizBox) quizBox.classList.remove('running');
        }
        presentationFrame.classList.remove('quiz-danger-mode');
    }
    
    document.querySelectorAll('.quiz-slide .option').forEach(option => {
        option.addEventListener('click', () => {
            stopTimer();
            selectedOption = option;
            showModal(quizConfirmModal);
        });
    });

    document.getElementById('quiz-cancel-btn').addEventListener('click', () => {
        selectedOption = null;
        hideModals();
        startTimer(slides[currentIndex]);
    });

    function showQuizResult(wasCorrect) {
        const selectedFeedbackContainer = document.getElementById('selected-answer-feedback');
        const otherOptionsContainer = document.getElementById('other-options-feedback');
    
        selectedFeedbackContainer.innerHTML = '';
        otherOptionsContainer.innerHTML = '';
    
        document.getElementById('quiz-result-title').textContent = wasCorrect ? "¡Correcto!" : "¡Incorrecto!";
        document.getElementById('quiz-result-icon').innerHTML = wasCorrect ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
        document.getElementById('quiz-result-icon').className = wasCorrect ? 'correct' : 'incorrect';
    
        const selectedExplanation = selectedOption.dataset.explanation;
        selectedFeedbackContainer.textContent = selectedExplanation;
        selectedFeedbackContainer.className = wasCorrect ? 'correct' : 'incorrect';

        const allOptions = Array.from(slides[currentIndex].querySelectorAll('.option'));
        const otherOptions = allOptions.filter(opt => opt !== selectedOption);

        otherOptions.forEach(opt => {
            const isThisOptionCorrect = opt.dataset.correct === 'true';
            const explanation = opt.dataset.explanation;
            const prefix = opt.querySelector('.option-prefix').textContent;
            const optionText = opt.textContent.replace(prefix, '').trim();

            const item = document.createElement('div');
            item.className = 'other-option-item';
            const iconClass = isThisOptionCorrect ? 'fas fa-check-circle icon correct' : 'fas fa-times-circle icon incorrect';
            
            item.innerHTML = `
                <div class="other-option-header">
                    <i class="${iconClass}"></i>
                    <span>${prefix} ${optionText}</span>
                </div>
                <p>${explanation}</p>
            `;
            otherOptionsContainer.appendChild(item);
        });
        showModal(quizResultModal);
    }

    document.getElementById('quiz-confirm-btn').addEventListener('click', () => {
        showModal(quizSuspenseModal);
        setTimeout(() => {
            const isCorrect = selectedOption && selectedOption.dataset.correct === 'true';
            showQuizResult(isCorrect);
        }, 3000);
    });
    
    document.getElementById('quiz-result-continue-btn').addEventListener('click', () => {
        hideModals();
        goToSlide(currentIndex + 1);
    });

    // --- LÓGICA DE ANIMACIONES (COMENTARIOS Y TEMBLOR) ---
    function startCommentAnimation() {
        const comments = document.querySelectorAll('.floating-comment');
        if (comments.length === 0) return;
        stopCommentAnimation();
        let commentIndex = 0;
        const showNextComment = () => {
            comments.forEach(c => c.classList.remove('visible'));
            comments[commentIndex].classList.add('visible');
            commentIndex = (commentIndex + 1) % comments.length;
        };
        showNextComment();
        commentInterval = setInterval(showNextComment, 6000);
    }

    function stopCommentAnimation() {
        if (commentInterval) clearInterval(commentInterval);
        commentInterval = null;
        document.querySelectorAll('.floating-comment').forEach(c => c.classList.remove('visible'));
    }

    function startShakeAnimation() {
        const post = document.querySelector('.instagram-post-mockup');
        if (!post) return;
        stopShakeAnimation();
        shakeInterval = setInterval(() => {
            post.classList.add('shaking-post');
            setTimeout(() => {
                post.classList.remove('shaking-post');
            }, 400);
        }, 6000);
    }

    function stopShakeAnimation() {
        if (shakeInterval) clearInterval(shakeInterval);
        shakeInterval = null;
        const post = document.querySelector('.instagram-post-mockup');
        if (post) post.classList.remove('shaking-post');
    }
    
    function resetQuizState(slide) {
        stopTimer();
        const quizBox = slide.querySelector('.quiz-box');
        if(quizBox) {
            quizBox.className = 'quiz-box anim';
        }
    }

    // --- FUNCIÓN PRINCIPAL PARA MOSTRAR UNA DIAPOSITIVA ---
    function goToSlide(index) {
        if (index < 0 || index >= totalSlides) return;
        hideModals();
        
        const currentSlide = slides[currentIndex];
        if (currentSlide.dataset.header === 'Evidencia Visual') {
            stopCommentAnimation();
            stopShakeAnimation();
            if (anatomyColumn) anatomyColumn.classList.remove('revealed');
        }
        if (currentSlide.classList.contains('quiz-slide')) resetQuizState(currentSlide);
        
        currentSlide.classList.remove('active');
        resetAnimations(currentSlide);
        
        currentIndex = index;
        const newSlide = slides[currentIndex];
        
        newSlide.classList.add('active');

        if (newSlide.dataset.triggerRaffle === 'true') {
            if (raffleParticipants === 0) {
                raffleInputView.classList.remove('hidden');
                raffleRunView.classList.add('hidden');
                raffleInputDisplay.value = '';
            } else {
                raffleInputView.classList.add('hidden');
                raffleRunView.classList.remove('hidden');
            }
            raffleResultView.classList.add('hidden');
            raffleAnimationDisplay.textContent = '--';
            raffleStartBtn.disabled = false;
            raffleBackBtn.classList.remove('hidden');
            showModal(raffleModal);
        }

        triggerAnimations(newSlide);
        if (newSlide.dataset.header === 'Evidencia Visual') {
            startCommentAnimation();
            startShakeAnimation();
        }
        if (newSlide.classList.contains('quiz-slide')) {
            startTimer(newSlide);
        }
        
        updateUI();
    }

    // --- FUNCIONES AUXILIARES ---
    function triggerAnimations(slide) {
        slide.querySelectorAll('.anim').forEach(el => {
            const delay = parseInt(el.dataset.delay, 10) || 0;
            setTimeout(() => el.classList.add('visible'), delay);
        });
    }

    function resetAnimations(slide) {
        slide.querySelectorAll('.anim').forEach(el => el.classList.remove('visible'));
    }

    function updateUI() {
        slideHeader.textContent = slides[currentIndex].dataset.header || '';
        navNumberBtns.forEach((btn, index) => btn.classList.toggle('active-slide', index === currentIndex));
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === totalSlides - 1;
    }

    // --- LÓGICA DE NAVEGACIÓN CENTRALIZADA ---
    function handleNext() {
        const isAnatomySlide = slides[currentIndex].dataset.header === 'Evidencia Visual';
        const isAnatomyRevealed = anatomyColumn && anatomyColumn.classList.contains('revealed');

        if (isAnatomySlide && !isAnatomyRevealed) {
            anatomyColumn.classList.add('revealed');
            return;
        }
        
        goToSlide(currentIndex + 1);
    }

    // --- EVENT LISTENERS ---
    nextBtn.addEventListener('click', handleNext);
    prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    
    window.addEventListener('keydown', (e) => {
        if (modalOverlay.classList.contains('visible')) {
            if (e.key === 'Enter') {
                if (!raffleInputView.classList.contains('hidden')) {
                    document.getElementById('raffle-accept-btn').click();
                } else if (!raffleRunView.classList.contains('hidden')) {
                    startRaffle();
                }
            }
            return;
        }
        if (e.key === 'ArrowRight') handleNext();
        else if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    });

    const handleSwipe = () => {
        const deltaX = touchendX - touchstartX;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

        if (deltaX < 0) {
            handleNext();
        } else {
            goToSlide(currentIndex - 1);
        }
    };

    slidesWrapper.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
    slidesWrapper.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleSwipe(); });
    slidesWrapper.addEventListener('mousedown', e => { touchstartX = e.screenX; });
    slidesWrapper.addEventListener('mouseup', e => { touchendX = e.screenX; handleSwipe(); });

    // --- INICIALIZACIÓN ---
    goToSlide(0);
});
