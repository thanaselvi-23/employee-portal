import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Employee, employeeService } from './api/employeeService';
import StatsPanel from './components/StatsPanel';
import SearchBox from './components/SearchBox';
import EmployeeTable from './components/EmployeeTable';
import EmployeeDetails from './components/EmployeeDetails';
import Loader from './components/Loader';
import ErrorView from './components/ErrorView';
import EmptyState from './components/EmptyState';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Favorites State
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [filterType, setFilterType] = useState<'all' | 'favorites'>('all');

  // Persist Favorites changes
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const toggleFavorite = useCallback((id: number) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  }, []);

  // Fetch employees
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || err.message || 'Failed to fetch employee database'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Handle Search Input Debounced Value
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Dynamically extract unique departments sorted alphabetically
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => {
      if (emp.company?.department) {
        depts.add(emp.company.department);
      }
    });
    return ['All', ...Array.from(depts).sort()];
  }, [employees]);

  // Combined filtering: Favorites Filter AND Search term AND selected department
  const filteredEmployees = useMemo(() => {
    let list = employees;

    // 1. Favorites Filter
    if (filterType === 'favorites') {
      list = list.filter((emp) => favoriteIds.includes(emp.id));
    }

    // 2. Department Filter
    if (selectedDepartment !== 'All') {
      list = list.filter((emp) => emp.company?.department === selectedDepartment);
    }

    // 3. Search Text Filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      list = list.filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = emp.email.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
    }

    return list;
  }, [employees, filterType, favoriteIds, searchTerm, selectedDepartment]);

  // If the selected employee is filtered out, deselect them (closes details drawer)
  useEffect(() => {
    if (selectedEmployee) {
      const isStillInResults = filteredEmployees.some((emp) => emp.id === selectedEmployee.id);
      if (!isStillInResults) {
        setSelectedEmployee(null);
      }
    }
  }, [filteredEmployees, selectedEmployee]);

  const handleSelectEmployee = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedDepartment('All');
    setFilterType('all');
  }, []);

  // Main Render Logic
  const renderContent = () => {
    if (loading) {
      return <Loader />;
    }

    if (error) {
      return <ErrorView message={error} onRetry={loadEmployees} />;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Dynamic Real-time Stats */}
        <StatsPanel employees={filteredEmployees} />

        {/* Search and Filters Tools Card */}
        <div
          className="card-base"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Favorites segmented control */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--gray-3)',
              paddingBottom: '12px',
              gap: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterType === 'all' ? 'var(--primary)' : 'var(--gray-11)',
                borderBottom: '2px solid',
                borderColor: filterType === 'all' ? 'var(--primary)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              All Employees
            </button>
            <button
              type="button"
              onClick={() => setFilterType('favorites')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterType === 'favorites' ? 'var(--primary)' : 'var(--gray-11)',
                borderBottom: '2px solid',
                borderColor: filterType === 'favorites' ? 'var(--primary)' : 'transparent',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Favorites
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--orange-3)',
                  color: 'var(--orange-9)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                {favoriteIds.length}
              </span>
            </button>
          </div>

          {/* Top Row: Search input box and match counters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <SearchBox onSearchChange={handleSearch} />
            </div>
            {(searchTerm || selectedDepartment !== 'All') && (
              <span className="caption-text" style={{ whiteSpace: 'nowrap' }}>
                Found <strong>{filteredEmployees.length}</strong> matching entries
              </span>
            )}
          </div>

          {/* Bottom Row: Scrollable Department Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              className="caption-text"
              style={{
                color: 'var(--gray-11)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Filter by Department
            </span>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {departments.map((dept) => {
                const isSelected = dept === selectedDepartment;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--gray-3)',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface-primary)',
                      color: isSelected ? '#ffffff' : 'var(--gray-11)',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(147, 51, 234, 0.15)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--gray-2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-primary)';
                      }
                    }}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Directory Grid Area */}
        {filteredEmployees.length === 0 ? (
          <EmptyState query={searchTerm || selectedDepartment} onClear={handleClearFilters} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Master list (Full width table directory) */}
            <div className="card-base" style={{ overflow: 'hidden', padding: '12px 0 0 0' }}>
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--gray-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2
                  className="subtitle"
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '14px',
                    color: 'var(--gray-13)',
                  }}
                >
                  Employee Directory
                </h2>
                <span className="caption-text" style={{ color: 'var(--gray-10)' }}>
                  Showing {filteredEmployees.length} of {employees.length}
                </span>
              </div>
              <EmployeeTable
                employees={filteredEmployees}
                selectedId={selectedEmployee?.id || null}
                onSelectEmployee={handleSelectEmployee}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            {/* Slide-out details drawer overlays on top of the app view when selectedEmployee !== null */}
            <EmployeeDetails
              employee={selectedEmployee}
              onClose={() => setSelectedEmployee(null)}
              isFavorite={selectedEmployee ? favoriteIds.includes(selectedEmployee.id) : false}
              onToggleFavorite={() => selectedEmployee && toggleFavorite(selectedEmployee.id)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Panel */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          borderBottom: '1px solid var(--gray-3)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '16px', margin: 0 }}>
              Employee Portal
            </h1>
            <p className="caption-text" style={{ fontSize: '11px', marginTop: '1px' }}>
              Employee Management Dashboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadEmployees}
            disabled={loading}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: '4px' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main>{renderContent()}</main>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
