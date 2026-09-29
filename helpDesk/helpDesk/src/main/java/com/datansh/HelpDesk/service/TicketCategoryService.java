package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateTicketCategoryRequest;
import com.datansh.HelpDesk.dto.TicketCategoryResponse;
import com.datansh.HelpDesk.entity.TicketCategory;
import com.datansh.HelpDesk.repository.TicketCategoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TicketCategoryService {
    private final TicketCategoryRepository repository;
    public TicketCategoryService(TicketCategoryRepository repository){
        this.repository = repository;
    }
    public Page<TicketCategoryResponse> getAllCategories(Pageable pageable){
         return repository.findAll(pageable).map(this::mapToResponse);
    }

    public TicketCategoryResponse createTicketCategory(CreateTicketCategoryRequest request){
        TicketCategory category = TicketCategory.builder()
                .name(request.name())
                .description(request.description()).build();
        TicketCategory savedCategory = repository.save(category);
        return mapToResponse(savedCategory);
    }

    public TicketCategoryResponse mapToResponse(TicketCategory category){
        return new TicketCategoryResponse(category.getCategoryId(),
                category.getName(),
            category.getDescription());
    }
}
