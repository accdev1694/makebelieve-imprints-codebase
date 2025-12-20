import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'main';
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, as: Component = 'div', className = '', ...props }, ref) => {
    return (
      <Component ref={ref} className={`container-custom ${className}`} {...props}>
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';
