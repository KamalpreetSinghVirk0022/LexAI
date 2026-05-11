import React from 'react';

export default function PasswordStrength({ password, setPasswordValid }) {
  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };

    const hasLower = /[a-z]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLong = pass.length >= 8;

    if (hasLower) score += 1;
    if (hasUpper) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
    if (isLong) score += 1;

    const isValid = hasLower && hasUpper && hasNumber && hasSpecial && isLong;
    
    // Call the parent callback to update the validation state
    React.useEffect(() => {
      if (setPasswordValid) {
        setPasswordValid(isValid);
      }
    }, [isValid, setPasswordValid]);

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (isValid) return { score: 5, label: 'Strong', color: 'bg-green-500' };
    return { score, label: 'Good', color: 'bg-blue-500' };
  };

  const { score, label, color } = getStrength(password);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`flex-1 h-full transition-colors duration-300 ${
              index <= score ? color : 'bg-transparent'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">
          Must contain: uppercase, lowercase, number, special character (min 8)
        </span>
        <span className={`font-medium ${color.replace('bg-', 'text-')}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
