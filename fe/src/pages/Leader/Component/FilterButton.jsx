import React from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

const FilterButton = ({ onFilter }) => {
  const [selected, setSelected] = React.useState('all');

  const handleChange = (event) => {
    const value = event.target.value;
    setSelected(value);
    onFilter(value);
  };

  return (
    <FormControl 
      sx={{ 
        minWidth: 220,
        '& .MuiOutlinedInput-root': {
          borderRadius: '26px',
          backgroundColor: selected !== 'all' ? '#bbdefb' : 'transparent',
          '&:hover': {
            backgroundColor: selected !== 'all' ? '#90caf9' : 'rgba(0, 0, 0, 0.04)'
          }
        },
        '& .MuiSelect-icon': {
          right: 12
        }
      }}
    >
      <Select
        value={selected}
        onChange={handleChange}
        displayEmpty
        renderValue={(value) => {
          return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ color: 'action.active', marginRight: 1 }} />
              {value === 'all' ? 'Tất cả giáo viên' : 
               value === 'below' ? 'Chưa đạt tiết chuẩn' : 
               'Vượt quá 25%'}
            </div>
          );
        }}
        sx={{
          '& .MuiSelect-select': {
            paddingY: '10px',
          }
        }}
      >
        <MenuItem value="all">Tất cả giáo viên</MenuItem>
        <MenuItem value="below">Chưa đạt tiết chuẩn</MenuItem>
        <MenuItem value="above">Vượt quá 25% tiết chuẩn</MenuItem>
      </Select>
    </FormControl>
  );
};

export default FilterButton;