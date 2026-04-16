import PropTypes from 'prop-types';

const statusConfig = {
  verified: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: 'VERIFIED AGENT',
    bgClass: 'status-verified',
    glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    iconBg: 'bg-[var(--accent-emerald)]/20',
    iconColor: 'text-[var(--accent-emerald)]',
  },
  unverified: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    label: 'UNVERIFIED',
    bgClass: 'status-unverified',
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    iconBg: 'bg-[var(--accent-amber)]/20',
    iconColor: 'text-[var(--accent-amber)]',
  },
  flagged: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'FLAGGED',
    bgClass: 'status-flagged',
    glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    iconBg: 'bg-[var(--accent-red)]/20',
    iconColor: 'text-[var(--accent-red)]',
  },
};

// Tier configuration for verified agents
const tierConfig = {
  verified: {
    label: 'VERIFIED',
    badge: '★',
    bgClass: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
    borderClass: 'border-yellow-500/50',
    glowClass: 'shadow-[0_0_30px_rgba(255,215,0,0.3)]',
    textClass: 'text-yellow-400',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    shimmer: true,
  },
  standard: {
    label: 'TRUSTED',
    badge: '',
    bgClass: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    borderClass: 'border-blue-500/50',
    glowClass: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    textClass: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    shimmer: false,
  },
};

export default function TrustBadge({ 
  status = 'unverified', 
  name, 
  score, 
  registeredAt, 
  totalActions,
  tier,
  tierColor,
  className = '' 
}) {
  const config = statusConfig[status] || statusConfig.unverified;
  
  // Determine tier styling for verified agents
  const isVerified = status === 'verified';
  const tierStyle = isVerified && tier === 'verified' ? tierConfig.verified : 
                    isVerified ? tierConfig.standard : null;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Use tier styling if verified, otherwise use status styling
  const bgClass = tierStyle ? tierStyle.bgClass : config.bgClass;
  const glowClass = tierStyle ? tierStyle.glowClass : config.glowClass;
  const borderClass = tierStyle ? tierStyle.borderClass : '';
  const iconBg = tierStyle ? tierStyle.iconBg : config.iconBg;
  const iconColor = tierStyle ? tierStyle.iconColor : config.iconColor;
  const tierLabel = tierStyle ? `${tierStyle.badge} ${tierStyle.label}` : config.label;

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl border
        ${bgClass} ${glowClass} ${borderClass}
        transition-all duration-300 hover:scale-[1.02]
        ${className}
      `}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Gold shimmer effect for verified tier */}
      {tierStyle?.shimmer && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-shimmer" 
               style={{ transform: 'translateX(-100%)', animation: 'shimmer 2s infinite' }} />
        </div>
      )}
      
      <div className="relative p-4">
        {/* Header: Icon + Status Label */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold tracking-wider ${iconColor}`}>
              {tierLabel}
            </div>
            {name && (
              <div className="text-[var(--text-primary)] font-semibold truncate text-lg">
                {name}
              </div>
            )}
          </div>
          {score !== undefined && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${tierStyle ? tierStyle.textClass : 'text-[var(--text-primary)]'}`}>
                {score}
                <span className="text-sm font-normal text-[var(--text-muted)]">/100</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent my-3" />

        {/* Footer: Meta info */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Bags Ecosystem
            </span>
          </div>
          <div className="flex items-center gap-3">
            {registeredAt && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(registeredAt)}
              </span>
            )}
            {totalActions !== undefined && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {totalActions.toLocaleString()} actions
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

TrustBadge.propTypes = {
  status: PropTypes.oneOf(['verified', 'unverified', 'flagged']),
  name: PropTypes.string,
  score: PropTypes.number,
  registeredAt: PropTypes.string,
  totalActions: PropTypes.number,
  tier: PropTypes.oneOf(['verified', 'standard']),
  tierColor: PropTypes.string,
  className: PropTypes.string,
};
