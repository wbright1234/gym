import React from 'react';
import { Pagination, PaginationItem, PaginationLink } from 'reactstrap';
import _ from 'lodash';

export default class CalendarPagination extends React.Component {
  render() {
    const { activeIndex, className, onPaginate } = this.props;
    return (
      <Pagination size='sm' className={className}>
        {
          _.times(12, (id) => (
            <PaginationItem key={`${id}`} active={activeIndex === id + 1} onClick={() => onPaginate(id + 1)}>
              <PaginationLink className='text-gray'>
                {id + 1}
              </PaginationLink>
            </PaginationItem>
          ))
        }
      </Pagination>
    )
  }
}
