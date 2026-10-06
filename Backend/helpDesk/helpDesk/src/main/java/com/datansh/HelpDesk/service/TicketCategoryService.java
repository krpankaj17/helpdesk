package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateTicketCategoryRequest;
import com.datansh.HelpDesk.dto.TicketCategoryResponse;
import com.datansh.HelpDesk.dto.UpdateTicketCategoryRequest;
import com.datansh.HelpDesk.entity.TicketCategory;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.TicketCategoryRepository;
import com.datansh.HelpDesk.repository.TicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TicketCategoryService {
    private static final Logger log = LoggerFactory.getLogger(TicketCategoryService.class);
    private final TicketCategoryRepository repository;
    private final TicketRepository ticketRepository;

    public TicketCategoryService(TicketCategoryRepository repository, TicketRepository ticketRepository){
        this.repository = repository;
        this.ticketRepository = ticketRepository;
    }

    public Page<TicketCategoryResponse> getAllCategories(Pageable pageable){
        Map<Long, Long> countsMap = getTicketCountsMap();
        return repository.findAll(pageable).map(cat -> mapToResponse(cat, countsMap.getOrDefault(cat.getCategoryId(), 0L)));
    }

    private Map<Long, Long> getTicketCountsMap() {
        Map<Long, Long> countsMap = new HashMap<>();
        List<Object[]> rows = ticketRepository.countTicketsByCategory();
        if (rows != null) {
            for (Object[] row : rows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    countsMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
                }
            }
        }
        return countsMap;
    }

    public TicketCategoryResponse createTicketCategory(CreateTicketCategoryRequest request){
        TicketCategory category = TicketCategory.builder()
                .name(request.name())
                .description(request.description()).build();
        TicketCategory savedCategory = repository.save(category);
        log.info("Ticket category created: " + savedCategory.getName() + " with id: " + savedCategory.getCategoryId());
        return mapToResponse(savedCategory, 0L);
    }

    public TicketCategoryResponse updateTicketCategory(UpdateTicketCategoryRequest request,Long id){
        TicketCategory category = repository.findById(id).orElseThrow(()->new ResourceNotFoundException("Category", "id", id));
        if(request.name() != null){
            category.setName(request.name());
        }
        if(request.description() != null){
            category.setDescription(request.description());
        }
        TicketCategory savedCategory = repository.save(category);
        log.info("Ticket category updated: " + savedCategory.getName() + " with id: " + id);
        Map<Long, Long> countsMap = getTicketCountsMap();
        return mapToResponse(savedCategory, countsMap.getOrDefault(savedCategory.getCategoryId(), 0L));
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteCategory(Long id){
        TicketCategory category = repository.findById(id).orElseThrow(()->new ResourceNotFoundException("Category", "id", id));
        ticketRepository.disassociateCategoryFromTickets(id);
        repository.delete(category);
        log.info("Ticket category deleted with id: " + id);
    }

    public TicketCategoryResponse getCategoryById(Long id){
        TicketCategory category = repository.findById(id).orElseThrow(()->new ResourceNotFoundException("Category", "id", id));
        Map<Long, Long> countsMap = getTicketCountsMap();
        return mapToResponse(category, countsMap.getOrDefault(category.getCategoryId(), 0L));
    }

    public TicketCategoryResponse mapToResponse(TicketCategory category){
        return mapToResponse(category, 0L);
    }

    public TicketCategoryResponse mapToResponse(TicketCategory category, Long ticketCount){
        return new TicketCategoryResponse(
                category.getCategoryId(),
                category.getName(),
                category.getDescription(),
                ticketCount != null ? ticketCount : 0L
        );
    }
}
