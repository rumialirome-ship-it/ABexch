import React from 'react';
import { BetStatus } from '../../types';

interface FilterControlsProps {
  filters: {
    status: string;
    gameType: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (name: string, value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  onResetFilters: () => void;
}

const selectClasses = "transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-text-primary text-sm";
const inputClasses = "transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-text-primary text-sm";

const sortOptions = [
    { value: 'createdAt_desc', label: 'Date: Newest First' },
    { value: 'createdAt_asc', label: 'Date: Oldest First' },
    { value: 'stake_desc', label: 'Stake: High to Low' },
    { value: 'stake_asc', label: 'Stake: Low to High' },
];

const gameTypeOptions = ['All', '2D', '1D-Open', '1D-Close'];

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  onResetFilters
}) => {
  return (
    <div className="bg-background-primary/50 p-4 rounded-lg border border-border-color mb-6 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-6 md:gap-4 md:items-end">
      
      {/* Game Type Filter */}
      <div>
        <label className="block text-text-secondary text-sm mb-1">Game Type</label>
        <select
          name="gameType"
          value={filters.gameType}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className={selectClasses}
        >
          {gameTypeOptions.map(type => <option key={type} value={type === 'All' ? '' : type}>{type}</option>)}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-text-secondary text-sm mb-1">Status</label>
        <select
          name="status"
          value={filters.status}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className={selectClasses}
        >
          <option value="">All</option>
          {[BetStatus.PENDING, BetStatus.WON, BetStatus.LOST].map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Date Filters */}
      <div>
        <label className="block text-text-secondary text-sm mb-1">Start Date</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className={inputClasses}
          style={{ colorScheme: 'dark' }}
        />
      </div>
      <div>
        <label className="block text-text-secondary text-sm mb-1">End Date</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className={inputClasses}
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-text-secondary text-sm mb-1">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className={selectClasses}
        >
          {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {/* Reset Button */}
      <div className="lg:col-span-1">
        <button
          onClick={onResetFilters}
          className="w-full border border-border-color text-text-secondary font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default FilterControls;
