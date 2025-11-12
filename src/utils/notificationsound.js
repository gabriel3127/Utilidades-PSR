// notificationSound.js - Gerenciador de som de notificações

class NotificationSound {
  constructor() {
    // Criar Audio Context para gerar som sintetizado
    this.audioContext = null;
    this.enabled = true;
  }

  // Inicializar AudioContext (precisa de interação do usuário)
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Tocar som de notificação (tom suave e agradável)
  play() {
    if (!this.enabled) return;

    try {
      this.init();

      // Criar oscilador para o som
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Conectar oscilador ao gain e ao destino
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configurar frequências para um som agradável (acorde)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2); // G5

      // Envelope do som (fade in/out)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

      // Tocar som
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);

    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  }

  // Habilitar/desabilitar som
  toggle(enabled) {
    this.enabled = enabled;
  }

  // Verificar se está habilitado
  isEnabled() {
    return this.enabled;
  }
}

// Exportar instância única
export const notificationSound = new NotificationSound();

// Função helper para usar no código
export const playNotificationSound = () => {
  notificationSound.play();
};